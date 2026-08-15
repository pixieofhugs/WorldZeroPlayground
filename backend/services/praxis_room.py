"""A praxis is written in a room, and the room is not the record (ADR-0073).

A **room** is the live editing space for one praxis: a server-held CRDT document
plus the members currently connected. It mounts as an ASGI WebSocket route
inside this same FastAPI app (``main.py``) — one process, one deploy, no second
service.

Four rules live here, and all four are here rather than in a client because a
rule that runs on the client is not a rule:

1. **The server seeds the document exactly once**, from ``praxis.body_text``,
   when a room first opens. Clients never seed. Two clients independently
   building a document out of the same text merge into *two copies of that
   text* — the standard Yjs duplication footgun. ``_open_lock`` is what makes
   "once" true under a simultaneous double connect, and the Y-store is what
   keeps it true across a room restart.
2. **The document persists to Postgres.** ``pycrdt-websocket``'s bundled stores
   are SQLite/file only, so :class:`PostgresYStore` is ours, with a squash
   policy — a Y store appends every update forever otherwise.
3. **Authorization has two doors.** At connect, ``Origin`` is validated by hand
   (``CORSMiddleware`` does not apply to WebSockets, so the allowlist that
   protects every REST route would silently not protect this one) and the
   praxis's existing member check runs against the cookie's account. At revoke,
   kick and leave *close the socket*: a gate checked only on the way in lets a
   removed member keep writing until they close the tab.
4. **Exactly one backend instance may run**, because rooms live in-process.
   Enforced by :func:`acquire_single_instance_lock`. ADR-0073 states the
   constraint once; ADR-0012's lazy-on-access timeout depends on the same fact.

What is deliberately *not* here: ``praxis.body_text`` is still written by the
existing debounced ``PUT`` (retired in #1743), and nothing freezes a room on
submit yet (#1745).
"""

import logging
import re
from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager
from http.cookies import CookieError, SimpleCookie
from typing import Any

import anyio
from anyio import Event, Lock
from fastapi import HTTPException
from pycrdt import Doc, Text
from pycrdt.store import BaseYStore, YDocNotFound
from pycrdt.websocket import ASGIServer, WebsocketServer, YRoom
from pycrdt.websocket.asgi_server import ASGIWebsocket
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession

from config import settings
from db import AsyncSessionLocal
from models.account import Account, AccountStatus
from models.praxis import Praxis
from models.praxis_room import PraxisRoomUpdate
from services.auth import decode_jwt
from services.character import resolve_active_character

logger = logging.getLogger(__name__)

# The co-edited body inside a room's document — the one root type this issue
# seeds. #1742 binds CodeMirror to it; #1743 flushes it back to
# ``praxis.body_text``. The title is a last-write-wins map key (ADR-0073) and
# arrives with the editor that needs it.
ROOM_BODY_KEY = "body"

# The socket's path, relative to the mount in ``main.py`` — ``/rooms/praxis/12``.
_ROOM_PATH = re.compile(r"^/praxis/(?P<praxis_id>\d+)/?$")

# RFC 6455 "policy violation": the close code for a socket refused or revoked on
# authorization grounds, as opposed to one that simply ended.
_WS_POLICY_VIOLATION = 1008

_DISCONNECTED: dict[str, Any] = {"type": "websocket.disconnect", "code": 1000}

# Fold a document's stored updates into one once it has more rows than this.
#
# ponytail: a plain row count, folded inside the writing transaction. The
# ceiling is document size — squashing a very large document rewrites all of it
# in one statement. Upgrade path when that bites: periodic checkpoint rows plus
# a tail of updates, the shape ``pycrdt``'s own SQLiteYStore uses.
_SQUASH_UPDATES_ABOVE = 200

# A named, session-level advisory lock. Any constant would do; this one reads as
# the issue number so a human finding it in ``pg_locks`` can find the reason.
_SINGLE_INSTANCE_LOCK_KEY = 17400073

SessionFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]


def room_name_for(praxis_id: int) -> str:
    """The room key for a praxis — also the Y-store document path."""
    return f"praxis:{praxis_id}"


def _praxis_id_of(room_name: str) -> int:
    return int(room_name.split(":", 1)[1])


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


class PostgresYStore(BaseYStore):
    """A ``BaseYStore`` over ``praxis_room_update``.

    ``pycrdt-store`` ships a file store and an SQLite store, neither of which is
    the database this app already runs. The contract is two methods: ``write``
    appends one update, ``read`` yields them oldest-first and raises
    ``YDocNotFound`` when the document does not exist — which is exactly the
    signal :meth:`PraxisRoomServer._load_or_seed` uses to decide whether a room
    is opening for the first time.
    """

    def __init__(
        self,
        path: str,
        metadata_callback: Callable[[], Any] | None = None,
        log: logging.Logger | None = None,
        *,
        session_factory: SessionFactory = AsyncSessionLocal,
        squash_updates_above: int = _SQUASH_UPDATES_ABOVE,
    ) -> None:
        self.path = path
        self.praxis_id = _praxis_id_of(path)
        self.metadata_callback = metadata_callback
        self.log = log or logger
        self._session_factory = session_factory
        self._squash_updates_above = squash_updates_above

    async def read(self) -> AsyncIterator[tuple[bytes, bytes, float]]:
        """Yield ``(update, metadata, timestamp)`` oldest-first.

        Raises:
            YDocNotFound: if this praxis has no stored document.
        """
        async with self._session_factory() as session:
            # Column-level select on purpose: an ORM entity load would hand back
            # whatever is already in the session's identity map, whose
            # server-defaulted ``created_at`` may not be loaded.
            rows = (
                await session.execute(
                    select(PraxisRoomUpdate.update, PraxisRoomUpdate.created_at)
                    .where(PraxisRoomUpdate.praxis_id == self.praxis_id)
                    .order_by(PraxisRoomUpdate.id)
                )
            ).all()
        if not rows:
            raise YDocNotFound
        metadata = await self.get_metadata()
        for update, created_at in rows:
            yield update, metadata, created_at.timestamp()

    async def write(self, data: bytes) -> None:
        """Append one update, squashing the document's history if it has grown."""
        async with self._session_factory() as session:
            session.add(PraxisRoomUpdate(praxis_id=self.praxis_id, update=data))
            await session.flush()
            await self._squash_if_needed(session)
            await session.commit()

    async def _squash_if_needed(self, session: AsyncSession) -> None:
        count = await session.scalar(
            select(func.count())
            .select_from(PraxisRoomUpdate)
            .where(PraxisRoomUpdate.praxis_id == self.praxis_id)
        )
        if count is None or count <= self._squash_updates_above:
            return

        rows = (
            await session.execute(
                select(PraxisRoomUpdate.update)
                .where(PraxisRoomUpdate.praxis_id == self.praxis_id)
                .order_by(PraxisRoomUpdate.id)
            )
        ).all()
        squashed = Doc()
        for (update,) in rows:
            squashed.apply_update(update)

        await session.execute(
            delete(PraxisRoomUpdate).where(PraxisRoomUpdate.praxis_id == self.praxis_id)
        )
        session.add(
            PraxisRoomUpdate(praxis_id=self.praxis_id, update=squashed.get_update())
        )
        await session.flush()
        self.log.info(
            "Squashed %d updates for praxis room %s", len(rows), self.path
        )


# ---------------------------------------------------------------------------
# Authorization — door one, at connect
# ---------------------------------------------------------------------------


def _header(scope: dict[str, Any], name: str) -> str | None:
    wanted = name.encode("latin-1")
    for key, value in scope.get("headers", []):
        if key.lower() == wanted:
            return value.decode("latin-1")
    return None


def origin_allowed(origin: str | None) -> bool:
    """Door one's ``Origin`` half — the same allowlist ``CORSMiddleware`` reads.

    No ``Origin`` at all fails closed. Every browser sends one, and cross-site
    WebSocket hijacking is a browser-only attack — a script cannot ride a
    victim's cookie — so refusing the header-less handshake costs nothing real
    and keeps the production rule "a valid known ``Origin``, or nothing".
    Non-browser clients (the pytest room clients) set
    ``ROOM_ALLOW_MISSING_ORIGIN``.
    """
    if origin is None:
        return settings.ROOM_ALLOW_MISSING_ORIGIN
    return origin in settings.cors_origins


def _access_token(cookie_header: str | None) -> str | None:
    """The ``access_token`` cookie — the same credential every REST route uses.

    No ticket endpoint and no token in the URL: the JWT cookie is host-only on
    the API's own host and same-site with the frontend, so the browser already
    attaches it to the handshake (ADR-0073).
    """
    if not cookie_header:
        return None
    cookies: SimpleCookie = SimpleCookie()
    try:
        cookies.load(cookie_header)
    except CookieError:
        return None
    morsel = cookies.get("access_token")
    return morsel.value if morsel is not None else None


# ---------------------------------------------------------------------------
# One connected client
# ---------------------------------------------------------------------------


class _RoomConnection:
    """One open socket, and who is on the other end of it.

    ``pycrdt-websocket`` knows a client only as a channel, and every channel in
    a room shares one path — so nothing in the library can answer "which socket
    belongs to the member we just kicked?". This wrapper does, which is what
    makes door two possible.
    """

    def __init__(
        self,
        receive: Callable[[], Any],
        send: Callable[[dict[str, Any]], Any],
        praxis_id: int,
        character_id: int,
    ) -> None:
        self.praxis_id = praxis_id
        self.character_id = character_id
        self.room_name = room_name_for(praxis_id)
        self.revoked = False
        self._raw_receive = receive
        self._revoke_event = Event()
        self.channel = ASGIWebsocket(self._receive, send, self.room_name)

    def revoke(self) -> None:
        """End this socket. Safe to call from any task: it only sets an event.

        The socket is not closed from the revoking task — a WebSocket has one
        writer, and that is the task serving it. Waking its ``receive`` with a
        disconnect unwinds the serve loop, which closes on its way out.
        """
        self.revoked = True
        self._revoke_event.set()

    async def _receive(self) -> dict[str, Any]:
        """The client's next ASGI message, or a disconnect if we revoked them."""
        if self._revoke_event.is_set():
            return _DISCONNECTED
        received: dict[str, Any] = _DISCONNECTED

        async def await_revoke() -> None:
            await self._revoke_event.wait()
            task_group.cancel_scope.cancel()

        async def await_message() -> None:
            nonlocal received
            received = await self._raw_receive()
            task_group.cancel_scope.cancel()

        async with anyio.create_task_group() as task_group:
            task_group.start_soon(await_revoke)
            task_group.start_soon(await_message)
        return received


# ---------------------------------------------------------------------------
# The room server
# ---------------------------------------------------------------------------


class PraxisRoomServer(WebsocketServer):
    """Rooms, seeded once and persisted, plus the register of who is connected."""

    def __init__(
        self,
        session_factory: SessionFactory = AsyncSessionLocal,
        log: logging.Logger | None = None,
        squash_updates_above: int = _SQUASH_UPDATES_ABOVE,
    ) -> None:
        super().__init__(
            rooms_ready=False,
            # Rooms are dropped by :meth:`release` instead, under the same lock
            # that opens them — the base class's clean-up races a connect that
            # is mid-seed for the room it is deleting.
            auto_clean_rooms=False,
            log=log or logger,
        )
        self._session_factory = session_factory
        self._squash_updates_above = squash_updates_above
        self._connections: set[_RoomConnection] = set()
        self.__open_lock: Lock | None = None

    @property
    def _open_lock(self) -> Lock:
        # Lazily, like the library's own locks: this object is a module
        # singleton constructed at import time, outside any event loop.
        if self.__open_lock is None:
            self.__open_lock = Lock()
        return self.__open_lock

    # -- rooms ------------------------------------------------------------

    async def get_room(self, name: str) -> YRoom:
        """Open the room for ``name``, seeding it once if it is new.

        Everything between "is there a room?" and "the room is ready" happens
        under one lock. Without it two sockets arriving together each find no
        room, each seed from ``body_text``, and the praxis ends up holding its
        own body twice.
        """
        async with self._open_lock:
            room = self.rooms.get(name)
            if room is not None:
                await self.start_room(room)
                return room

            room = YRoom(
                ready=False,
                ystore=PostgresYStore(
                    name,
                    log=self.log,
                    session_factory=self._session_factory,
                    squash_updates_above=self._squash_updates_above,
                ),
                log=self.log,
            )
            self.rooms[name] = room
            await self.start_room(room)
            await self._load_or_seed(room, name)
            # Only now may clients synchronize against it.
            room.ready = True
            return room

    async def _load_or_seed(self, room: YRoom, name: str) -> None:
        store = room.ystore
        assert store is not None
        try:
            await store.apply_updates(room.ydoc)
            return
        except YDocNotFound:
            pass

        praxis_id = _praxis_id_of(name)
        async with self._session_factory() as session:
            body_text = await session.scalar(
                select(Praxis.body_text).where(Praxis.id == praxis_id)
            )
        room.ydoc[ROOM_BODY_KEY] = Text(body_text or "")
        # Written explicitly rather than left to the room's update observer,
        # which does not subscribe until the room is ready.
        await store.write(room.ydoc.get_update())
        self.log.info("Seeded praxis room %s from body_text", name)

    # -- connections ------------------------------------------------------

    def register(self, connection: _RoomConnection) -> None:
        self._connections.add(connection)

    async def release(self, connection: _RoomConnection) -> None:
        """Forget a socket, and drop its room once nobody is left in it."""
        self._connections.discard(connection)
        # Shielded: this runs in a ``finally`` that a client disconnect may
        # already have cancelled, and the room still has to be stopped.
        with anyio.CancelScope(shield=True):
            async with self._open_lock:
                room = self.rooms.get(connection.room_name)
                if room is not None and not room.clients:
                    await self.delete_room(room=room)

    def revoke(self, praxis_id: int, character_id: int) -> None:
        """Door two: close every socket this character holds on this praxis."""
        for connection in list(self._connections):
            if (
                connection.praxis_id == praxis_id
                and connection.character_id == character_id
            ):
                connection.revoke()

    # -- authorization ----------------------------------------------------

    async def authorize(self, scope: dict[str, Any], praxis_id: int) -> int | None:
        """Door one. Returns the connecting character's id, or ``None`` to refuse.

        Deliberately answers ``None`` for every refusal rather than saying which
        door shut: a handshake is not a place to tell an unauthenticated caller
        whether a praxis exists.
        """
        if not origin_allowed(_header(scope, "origin")):
            logger.info("Praxis room handshake refused: Origin not allowed")
            return None

        token = _access_token(_header(scope, "cookie"))
        if token is None:
            return None
        try:
            account_id = int(decode_jwt(token)["sub"])
        except (HTTPException, KeyError, TypeError, ValueError):
            return None

        async with self._session_factory() as session:
            account = await session.scalar(
                select(Account).where(Account.id == account_id)
            )
            if account is None or account.status != AccountStatus.active:
                return None
            character = await resolve_active_character(account, session)
            if character is None:
                return None
            praxis = await session.scalar(
                select(Praxis).where(Praxis.id == praxis_id)
            )
            if praxis is None:
                return None
            # The praxis membership rule has one implementation and this is it
            # (ADR-0013). Imported here rather than at module scope because
            # ``services.praxis`` imports this module for the revoke door.
            from services.praxis import _require_member

            try:
                _require_member(praxis, character.id, "edit")
            except HTTPException:
                logger.info(
                    "Praxis room handshake refused: character %d is not a member of praxis %d",
                    character.id,
                    praxis_id,
                )
                return None
        return character.id


class PraxisRoomASGIServer(ASGIServer):
    """The mounted ASGI app: authorize, accept, serve, and close on revoke.

    ``ASGIServer``'s own ``on_connect`` hook can refuse a socket but never sees
    the channel that follows, so it cannot support door two. This overrides the
    WebSocket branch to keep hold of both.
    """

    def __init__(self, websocket_server: PraxisRoomServer) -> None:
        super().__init__(websocket_server)
        self.rooms = websocket_server

    async def __call__(
        self,
        scope: dict[str, Any],
        receive: Callable[[], Any],
        send: Callable[[dict[str, Any]], Any],
    ) -> None:
        if scope["type"] == "http":
            # The mount answers WebSockets only; a plain GET is a 404, not a
            # hung request.
            await send(
                {
                    "type": "http.response.start",
                    "status": 404,
                    "headers": [(b"content-type", b"text/plain; charset=utf-8")],
                }
            )
            await send({"type": "http.response.body", "body": b"Not Found"})
            return
        if scope["type"] != "websocket":
            await super().__call__(scope, receive, send)
            return

        message = await receive()
        if message["type"] != "websocket.connect":
            return

        match = _ROOM_PATH.match(scope.get("path", ""))
        if match is None:
            await self._refuse(send)
            return
        praxis_id = int(match["praxis_id"])

        character_id = await self.rooms.authorize(scope, praxis_id)
        if character_id is None:
            await self._refuse(send)
            return

        await send({"type": "websocket.accept"})
        connection = _RoomConnection(receive, send, praxis_id, character_id)
        self.rooms.register(connection)
        try:
            await self.rooms.serve(connection.channel)
        finally:
            await self.rooms.release(connection)
            if connection.revoked:
                await self._refuse(send)

    async def _refuse(self, send: Callable[[dict[str, Any]], Any]) -> None:
        """Close the socket on policy grounds — before accept, or after revoke."""
        try:
            await send({"type": "websocket.close", "code": _WS_POLICY_VIOLATION})
        except Exception:  # pragma: no cover — the client may already be gone
            logger.debug("Praxis room socket already closed", exc_info=True)


# The app's rooms. ``main.py`` runs this for the process's life and mounts the
# app below; ``services.praxis`` reaches it through :func:`close_member_sockets`.
PRAXIS_ROOM_SERVER = PraxisRoomServer()
PRAXIS_ROOM_APP = PraxisRoomASGIServer(PRAXIS_ROOM_SERVER)


def close_member_sockets(praxis_id: int, character_id: int) -> None:
    """Door two, for kick and leave. A no-op when the member has no socket open.

    Called before the removing transaction commits, so a rollback would leave a
    member disconnected who is still a member. That is the harmless direction:
    reconnecting re-runs door one, which will let them straight back in.
    """
    PRAXIS_ROOM_SERVER.revoke(praxis_id, character_id)


# ---------------------------------------------------------------------------
# Exactly one instance
# ---------------------------------------------------------------------------


async def acquire_single_instance_lock(engine: AsyncEngine) -> AsyncConnection:
    """Claim the right to be the only backend instance, or refuse to start.

    Rooms live in-process, so two instances would hold two divergent documents
    for one praxis and flush both to ``body_text`` (ADR-0073, which also states
    the constraint ADR-0012's lazy-on-access timeout depends on).

    A startup *assertion* cannot express this: a process cannot see its own
    replica count, so two replicas would each pass their own check happily. A
    session-level advisory lock is held by one database session at a time, so
    the second instance — however it arose: a Render setting, a stray local
    ``uvicorn``, a blue-green deploy overlap — fails loudly instead. The cost is
    one pooled connection held for the life of the process.

    Returns:
        The connection holding the lock. Keep it; closing it releases the lock.
    """
    connection = await engine.connect()
    acquired = await connection.scalar(
        select(func.pg_try_advisory_lock(_SINGLE_INSTANCE_LOCK_KEY))
    )
    # Commit so the connection does not sit idle-in-transaction for the life of
    # the process. The lock is session-scoped and outlives the transaction.
    await connection.commit()
    if not acquired:
        await connection.close()
        raise RuntimeError(
            "Another World Zero backend instance already holds the single-instance "
            "lock on this database. Praxis rooms live in-process (ADR-0073), so a "
            "second instance would diverge one praxis into two documents. Refusing "
            "to start."
        )
    return connection
