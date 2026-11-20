"""The persistent moderation action log (#3548).

Every moderating service calls :func:`log_mod_action` in the same transaction as
the action, so no route has to remember to.
"""
from typing import Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.account import Account
from models.character import Character
from models.comment import Comment
from models.era import Era
from models.mod_action import ModAction
from models.praxis import Praxis
from models.task import Task


async def log_mod_action(
    session: AsyncSession,
    actor_account_id: int,
    action: str,
    target_type: str,
    target_id: int,
    detail: Optional[str] = None,
) -> None:
    session.add(
        ModAction(
            actor_account_id=actor_account_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            detail=detail,
        )
    )
    await session.flush()


#: Console segments over (target_type, action); "rules" holds era rollovers and
#: the Small world switches (``small_world_on``/``_off``, #3656).
def _kind_filter(kind: str):
    if kind == "reports":
        return or_(
            ModAction.target_type.in_(("praxis", "comment")),
            ModAction.action == "remove_flagged",
        )
    if kind == "tasks":
        return ModAction.target_type == "task"
    if kind == "people":
        return and_(
            ModAction.target_type.in_(("character", "account")),
            ModAction.action != "remove_flagged",
        )
    if kind == "rules":
        return ModAction.target_type == "era"
    raise ValueError(kind)


ModRow = tuple[ModAction, Optional[str], Optional[str], Optional[str]]
KINDS = ("reports", "tasks", "people", "rules")


def _first_character_name(account_id_col):
    return (
        select(Character.display_name)
        .where(Character.account_id == account_id_col)
        .order_by(Character.id)
        .limit(1)
        .scalar_subquery()
    )


def _search_filter(q: str):
    """A player, task or reason: the sentence a mod would read on the row."""
    like = f"%{q}%"
    named = select(Character.id).where(Character.display_name.ilike(like))
    return or_(
        ModAction.detail.ilike(like),
        _first_character_name(ModAction.actor_account_id).ilike(like),
        and_(ModAction.target_type == "character", ModAction.target_id.in_(named)),
        and_(
            ModAction.target_type == "account",
            ModAction.target_id.in_(
                select(Character.account_id).where(Character.display_name.ilike(like))
            ),
        ),
        and_(
            ModAction.target_type == "task",
            ModAction.target_id.in_(select(Task.id).where(Task.title.ilike(like))),
        ),
        and_(
            ModAction.target_type == "praxis",
            ModAction.target_id.in_(
                select(Praxis.id).where(
                    or_(Praxis.title.ilike(like), Praxis.created_by_id.in_(named))
                )
            ),
        ),
        and_(
            ModAction.target_type == "comment",
            ModAction.target_id.in_(
                select(Comment.id).where(Comment.created_by_id.in_(named))
            ),
        ),
        and_(
            ModAction.target_type == "era",
            ModAction.target_id.in_(select(Era.id).where(Era.name.ilike(like))),
        ),
    )


async def _target_names(
    session: AsyncSession, actions: list[ModAction]
) -> dict[tuple[str, int], tuple[Optional[str], Optional[str]]]:
    """(name, author) per target, so a row reads as a sentence, not an id."""
    ids = lambda t: {a.target_id for a in actions if a.target_type == t}  # noqa: E731
    out: dict[tuple[str, int], tuple[Optional[str], Optional[str]]] = {}

    async def fill(kind, stmt):
        for row in await session.execute(stmt):
            out[(kind, row[0])] = (row[1], row[2] if len(row) > 2 else None)

    if ids("character"):
        await fill(
            "character",
            select(Character.id, Character.display_name).where(
                Character.id.in_(ids("character"))
            ),
        )
    if ids("account"):
        await fill(
            "account",
            select(Account.id, _first_character_name(Account.id)).where(
                Account.id.in_(ids("account"))
            ),
        )
    if ids("task"):
        await fill("task", select(Task.id, Task.title).where(Task.id.in_(ids("task"))))
    if ids("era"):
        await fill("era", select(Era.id, Era.name).where(Era.id.in_(ids("era"))))
    if ids("praxis"):
        await fill(
            "praxis",
            select(Praxis.id, Praxis.title, Character.display_name)
            .join(Character, Character.id == Praxis.created_by_id)
            .where(Praxis.id.in_(ids("praxis"))),
        )
    if ids("comment"):
        await fill(
            "comment",
            select(Comment.id, func.left(Comment.body_text, 60), Character.display_name)
            .join(Character, Character.id == Comment.created_by_id)
            .where(Comment.id.in_(ids("comment"))),
        )
    return out


async def list_mod_actions(
    session: AsyncSession,
    offset: int = 0,
    limit: int = 50,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    kind: Optional[str] = None,
    actor_account_id: Optional[int] = None,
    q: Optional[str] = None,
) -> tuple[list[ModRow], int, dict[str, int]]:
    """Newest first: (action, actor name, target name, target author), the total, and
    the count per kind over the same actor + search filters (not the kind itself)."""
    filters = []
    if target_type is not None:
        filters.append(ModAction.target_type == target_type)
    if target_id is not None:
        filters.append(ModAction.target_id == target_id)
    if actor_account_id is not None:
        filters.append(ModAction.actor_account_id == actor_account_id)
    if q:
        filters.append(_search_filter(q))
    counts_row = (
        await session.execute(
            select(*[func.count().filter(_kind_filter(k)) for k in KINDS]).where(
                *filters
            )
        )
    ).one()
    if kind:
        filters.append(_kind_filter(kind))
    rows = await session.execute(
        select(ModAction, _first_character_name(ModAction.actor_account_id))
        .where(*filters)
        .order_by(ModAction.created_at.desc(), ModAction.id.desc())
        .offset(offset)
        .limit(limit)
    )
    pairs = rows.all()
    names = await _target_names(session, [a for a, _ in pairs])
    total = await session.scalar(
        select(func.count()).select_from(ModAction).where(*filters)
    )
    return (
        [
            (a, n, *names.get((a.target_type, a.target_id), (None, None)))
            for a, n in pairs
        ],
        total or 0,
        dict(zip(KINDS, counts_row)),
    )


async def list_mod_actors(session: AsyncSession) -> list[tuple[int, Optional[str]]]:
    """Every account that has logged an action, for the mod filter."""
    rows = await session.execute(
        select(
            ModAction.actor_account_id,
            _first_character_name(ModAction.actor_account_id),
        )
        .distinct()
        .order_by(ModAction.actor_account_id)
    )
    return [(a, n) for a, n in rows.all()]
