"""A praxis is written in a room, and the room is not the record (ADR-0073).

A **room** is the live editing space for one praxis: a server-held CRDT document
plus the members currently connected. It mounts as an ASGI WebSocket route
inside this same FastAPI app (``main.py``) — one process, one deploy, no second
service.

Five rules live here, and all five are here rather than in a client because a
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
3. **The room is the only way a praxis body is written** (#1743). The debounced
   ``PUT`` is gone, not kept as a fallback, so ``praxis.title`` and
   ``praxis.body_text`` are **derived columns**: :class:`_RoomFlusher` copies
   the document into them once the typing stops. That direction is one-way and
   the seed above is the only path back — a room that read the record it writes
   would seed itself.
4. **Authorization has two doors.** At connect, ``Origin`` is validated by hand
   (``CORSMiddleware`` does not apply to WebSockets, so the allowlist that
   protects every REST route would silently not protect this one) and the
   praxis's existing member check runs against the cookie's account. At revoke,
   kick and leave *close the socket*: a gate checked only on the way in lets a
   removed member keep writing until they close the tab.
5. **Exactly one backend instance may run**, because rooms live in-process.
   Enforced by :func:`acquire_single_instance_lock`. ADR-0073 states the
   constraint once; ADR-0012's lazy-on-access timeout depends on the same fact.
6. **Drafting is the only status a document may change in** (#1745). Submitting
   *freezes* the document for every member, the submitter included, so ADR-0012
   survives verbatim: its hard reset keys on an edit being a discrete event, and
   a CRDT has none — text simply moves. Nothing has to be reset while nothing
   can change. ``pullBack`` is the one door back in, and it is that ADR's hard
   reset. The freeze is enforced in :meth:`PraxisRoomServer._refuse_writes_when_frozen`
   rather than by a read-only editor, because a rule that runs on the client is
   not a rule — the composer must not be able to talk a frozen room into
   accepting text.
7. **Publishing destroys the document** (:meth:`PraxisRoomServer.discard_document`).
   It is flattened into ``body_text`` first and ``pullBack`` re-seeds a fresh one
   through rule 1, so nothing is lost that a reader could ever see. This is a
   privacy decision and not a storage one: a CRDT retains **tombstones**, so text
   a player typed and then deleted lives on in the document's history. Praxes are
   permanent; their drafts are not. Squashing is not the answer to that — folding
   the history re-encodes it and Yjs does garbage-collect deleted content on the
   way out, but only above ``_SQUASH_UPDATES_ABOVE``, so the raw tail beneath
   that threshold holds every recent retraction verbatim.
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
from pycrdt import Doc, Map, Text, YMessageType, YSyncMessageType
from pycrdt.store import BaseYStore, YDocNotFound
from pycrdt.websocket import ASGIServer, WebsocketServer, YRoom
from pycrdt.websocket.asgi_server import ASGIWebsocket
from sqlalchemy import delete, func, select
from sqlalchemy import update as sql_update
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession
from starlette.routing import get_route_path

from config import settings
from db import AsyncSessionLocal
from models.account import Account, AccountStatus
from models.praxis import Praxis, PraxisStatus
from models.praxis_room import PraxisRoomUpdate
from services.auth import decode_jwt
from services.character import resolve_active_character

logger = logging.getLogger(__name__)

# The co-edited body inside a room's document — the one root type the server
# seeds, and the one CodeMirror binds to (#1742).
ROOM_BODY_KEY = "body"

# The title, as **one last-write-wins map key** rather than co-edited text
# (ADR-0073): a praxis title is 200 characters, and interleaving two people
# typing one character-by-character produces garbage more often than it helps.
#
# Nothing seeds it. ``_load_or_seed`` writes ``body`` alone, so the key does not
# exist until a co-author edits a title — which is why :meth:`_RoomFlusher.write`
# reads its absence as "no room value yet" and never as "the title is empty".
ROOM_META_KEY = "meta"
ROOM_TITLE_KEY = "title"

# How long a room sits still before its document is copied into the praxis.
#
# The record is derived, so this is not "how long until your work is safe" —
# every update is already durable in ``praxis_room_update`` before this timer
# starts. It is how long until the *read* surfaces catch up, and the answer only
# has to beat a player finishing their write-up and going to look at it.
_FLUSH_DEBOUNCE_SECONDS = 2.0

# The socket's path *below* the mount in ``main.py``, which serves it at
# ``/rooms/praxis/12``. The prefix is deliberately not here: it belongs to the
# mount, and a sub-app that spelled it out would break the day the mount moved.
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
_LOCK_WAIT_SECONDS = 30.0
_LOCK_RETRY_SECONDS = 2.0

SessionFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]


def room_name_for(praxis_id: int) -> str:
    """The room key for a praxis — also the Y-store document path."""
    return f"praxis:{praxis_id}"


def _praxis_id_of(room_name: str) -> int:
    return int(room_name.split(":", 1)[1])


def is_frozen_status(status: PraxisStatus) -> bool:
    """Whether a praxis at this status has a sealed document (#1745).

    Written as "not drafting" rather than "pending or submitted" on purpose: a
    status added later arrives frozen, which is the safe direction. Drafting is
    the one state the ADR-0012 machine calls open, and it is the one state in
    which "everyone co-writes freely" is true.
    """
    return status != PraxisStatus.in_progress


def _document_values(document: Doc) -> dict[str, str]:
    """The praxis columns this document is the source of.

    One implementation for the debounced flush and for the publish-time flatten:
    they write the same two columns from the same two root types, and the title's
    absent/empty distinction below is too easy to get wrong twice.
    """
    values: dict[str, str] = {"body_text": str(document.get(ROOM_BODY_KEY, type=Text))}
    title = document.get(ROOM_META_KEY, type=Map).get(ROOM_TITLE_KEY)
    # ABSENT is "the room has no title yet", never "the title was cleared" —
    # nothing seeds this key, so it arrives with the first co-author to type in
    # the title box and not before. Reading it the other way would blank the
    # title of every praxis whose body someone edited.
    if isinstance(title, str):
        values["title"] = title
    return values


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
# The flush — the document becomes the record
# ---------------------------------------------------------------------------


class _RoomFlusher:
    """Copies one room's document into ``praxis.title`` / ``praxis.body_text``.

    Since #1743 this is the **only** writer of those two columns. There is no
    ``PUT`` behind it and no reconciliation rule to state, which is the point:
    two ways to persist a body means every future rule about saving has to be
    written twice and kept in step (ADR-0073, #1692).

    The copy is one-way. Nothing here re-reads the columns it writes — the
    server's single seed in :meth:`PraxisRoomServer._load_or_seed` is the only
    path from the record back into a document, and a flush that read as well as
    wrote would be that second seed.
    """

    def __init__(
        self,
        room: YRoom,
        praxis_id: int,
        session_factory: SessionFactory,
        debounce_seconds: float,
        log: logging.Logger,
    ) -> None:
        self._room = room
        self._praxis_id = praxis_id
        self._session_factory = session_factory
        self._debounce_seconds = debounce_seconds
        self._log = log
        self._changed = Event()
        self._pending = False
        self._cancel_scope: anyio.CancelScope | None = None

    def mark_changed(self) -> None:
        """The document moved. Safe from the observer: it only sets a flag."""
        self._pending = True
        self._changed.set()

    async def run(self) -> None:
        """Flush once the room has been quiet for the whole debounce window.

        Trailing edge, deliberately. A leading-edge flush would write the first
        character of every sentence and then nothing until the writer paused
        anyway, which is more statements for a column nobody is reading yet.
        """
        with anyio.CancelScope() as cancel_scope:
            self._cancel_scope = cancel_scope
            while True:
                await self._changed.wait()
                # Re-armed *before* the wait, so a keystroke arriving during it
                # restarts the quiet window instead of being swallowed by it.
                self._changed = Event()
                await anyio.sleep(self._debounce_seconds)
                if self._changed.is_set():
                    continue
                await self.write()

    async def close(self) -> None:
        """Stop, after one last flush if the room stopped mid-window.

        A tab closed two seconds after the last sentence would otherwise leave
        that sentence in the room's store and out of ``body_text``, where every
        read surface would look for it.
        """
        if self._cancel_scope is not None:
            self._cancel_scope.cancel()
        if self._pending:
            await self.write()

    def abandon(self) -> None:
        """Stop *without* the closing flush.

        For the publish-time discard alone (#1745), which has just written the
        document into the praxis itself, inside the publishing transaction. The
        closing flush would repeat that write on its own session and after that
        transaction — harmless in content, but it would be a room task writing
        to a praxis whose room no longer exists.
        """
        self._pending = False
        if self._cancel_scope is not None:
            self._cancel_scope.cancel()

    async def write(self) -> None:
        """One UPDATE, from whatever the document says right now.

        A Core statement rather than an ORM load: the entity's relationships are
        ``lazy='raise'``, and a room task has no business waking the identity map
        of a session that a request may also be holding.
        """
        values = _document_values(self._room.ydoc)

        async with self._session_factory() as session:
            await session.execute(
                sql_update(Praxis).where(Praxis.id == self._praxis_id).values(**values)
            )
            await session.commit()
        # Only once the write is committed: cancelled halfway, the room still
        # owes the praxis this text and :meth:`close` has to know it.
        self._pending = False


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
        flush_debounce_seconds: float = _FLUSH_DEBOUNCE_SECONDS,
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
        self._flush_debounce_seconds = flush_debounce_seconds
        self._connections: set[_RoomConnection] = set()
        self._flushers: dict[str, _RoomFlusher] = {}
        #: Praxes whose document is sealed (#1745). Only ever holds ids with a
        #: room open — :meth:`release` and :meth:`discard_document` drop theirs —
        #: because a room that is not open re-reads the status when it opens.
        self._frozen: set[int] = set()
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
            self._start_flusher(room, name)
            praxis_id = _praxis_id_of(name)
            room.on_message = self._refuse_writes_when_frozen(praxis_id)
            await self._read_freeze(praxis_id)
            # Only now may clients synchronize against it.
            room.ready = True
            return room

    async def _read_freeze(self, praxis_id: int) -> None:
        """Open the room in whatever state its praxis is already in (#1745).

        The consensus transitions push the flag onto rooms that are *live* when
        a praxis is submitted or reopened; this is what makes a praxis submitted
        while nobody was connected still open frozen. It is also the self-heal:
        the flag is derived from the status either way, so a push that never
        happened costs one reconnect rather than a permanently wrong room.
        """
        async with self._session_factory() as session:
            status = await session.scalar(
                select(Praxis.status).where(Praxis.id == praxis_id)
            )
        self.set_frozen(praxis_id, status is not None and is_frozen_status(status))

    def set_frozen(self, praxis_id: int, frozen: bool) -> None:
        """Seal or reopen this praxis's document. Idempotent, and takes no lock.

        Callable from a request task while the room's own tasks run: it only
        moves an ``int`` in or out of a set, which the message hook reads.
        """
        if frozen:
            self._frozen.add(praxis_id)
        else:
            self._frozen.discard(praxis_id)

    def _refuse_writes_when_frozen(
        self, praxis_id: int
    ) -> Callable[[bytes], bool]:
        """``YRoom.on_message``: drop what a frozen room must not accept.

        Returning ``True`` skips the message before the room applies it, which
        is what makes the freeze a rule instead of a client-side courtesy. It is
        a *room*-level hook rather than a per-socket one because the freeze binds
        every member equally — including whoever submitted. That is the word:
        a lock is something one member holds against the others.

        Two kinds of message still pass, and both have to:

        - ``SYNC_STEP1`` is a client asking what the server holds. Reading a
          sealed write-up is the whole point of showing it, and refusing this
          would leave the composer staring at an empty document.
        - Awareness carries no document state (presence is #1744), and
          ``y-websocket`` rides it as its keepalive, so dropping it would take
          the socket down rather than the edit.
        """

        def refuse(message: bytes) -> bool:
            if praxis_id not in self._frozen or not message:
                return False
            if message[0] != YMessageType.SYNC:
                return False
            # SYNC_STEP2 carries the client's missing updates and SYNC_UPDATE
            # its new ones; a truncated SYNC message is refused rather than
            # indexed past its end.
            return len(message) < 2 or message[1] != YSyncMessageType.SYNC_STEP1

        return refuse

    def _start_flusher(self, room: YRoom, name: str) -> None:
        """Watch this room's document and copy it into the praxis (#1743).

        Subscribed *after* the seed on purpose. The seed is the record's own
        text arriving in the document; flushing it straight back would be a
        write nobody asked for, on every room that opens.
        """
        assert self._task_group is not None  # start_room above proves it
        flusher = _RoomFlusher(
            room,
            _praxis_id_of(name),
            self._session_factory,
            self._flush_debounce_seconds,
            self.log,
        )
        self._flushers[name] = flusher
        room.ydoc.observe(lambda _event: flusher.mark_changed())
        self._task_group.start_soon(flusher.run)

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
                    flusher = self._flushers.pop(connection.room_name, None)
                    if flusher is not None:
                        await flusher.close()
                    await self.delete_room(room=room)
                    self._frozen.discard(connection.praxis_id)

    async def discard_document(self, praxis: Praxis, session: AsyncSession) -> None:
        """Publish: the document becomes the record, and is then destroyed (#1745).

        Ordered so that nothing can put a byte back afterwards. The room is
        stopped *before* its rows are deleted — stopping cancels the task that
        writes them — and the whole sequence holds ``_open_lock``, so a connect
        cannot re-seed a room into the gap.

        The praxis is written through the entity rather than by a Core statement
        (the shape :class:`_RoomFlusher` uses): the caller is holding this praxis
        and is about to seal it, so a statement past the identity map would
        publish a stale ``body_text`` in the very response that announces it.

        Every socket on the praxis is revoked. Their documents are the one the
        server just destroyed, so a client left holding one would merge it into
        the next freshly seeded room — the ADR-0073 duplication footgun arriving
        by its back door. Reconnecting is cheap and lands them on the real state.
        """
        name = room_name_for(praxis.id)
        async with self._open_lock:
            flusher = self._flushers.pop(name, None)
            if flusher is not None:
                flusher.abandon()
            room = self.rooms.get(name)
            if room is not None:
                for column, value in _document_values(room.ydoc).items():
                    setattr(praxis, column, value)
                await self.delete_room(room=room)
            for connection in list(self._connections):
                if connection.praxis_id == praxis.id:
                    connection.revoke()
            await session.execute(
                delete(PraxisRoomUpdate).where(
                    PraxisRoomUpdate.praxis_id == praxis.id
                )
            )
        self._frozen.discard(praxis.id)

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

        # ``get_route_path``, not ``scope["path"]``: a mounted ASGI app is
        # handed the **full** path (``/rooms/praxis/12``) with the prefix it was
        # mounted under recorded in ``root_path`` — Starlette's ``Mount`` sets
        # that and never rewrites the path. Reading the path raw refused every
        # handshake in production (#1740). This is the same helper ``Mount``
        # itself matches with, so the two cannot disagree about where the mount
        # ends, and it is what keeps the prefix ``main.py``'s to own.
        match = _ROOM_PATH.match(get_route_path(scope))
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


def follow_praxis_status(praxis: Praxis) -> None:
    """The room's freeze follows the praxis's status (#1745).

    Called by every ADR-0012 transition that moves a praxis in or out of
    drafting. Derived from the status rather than from the transition, so it is
    idempotent and the call sites do not each have to know which way they moved
    a praxis — and a room that is not open ignores it and reads the status when
    it opens.
    """
    PRAXIS_ROOM_SERVER.set_frozen(praxis.id, is_frozen_status(praxis.status))


async def discard_room_document(praxis: Praxis, session: AsyncSession) -> None:
    """Flatten this praxis's document into it and destroy the document (#1745).

    The publish half of the freeze, called from ADR-0012's single seal. Runs in
    the caller's transaction: a seal that rolls back keeps the draft.
    """
    await PRAXIS_ROOM_SERVER.discard_document(praxis, session)


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


async def acquire_single_instance_lock(
    engine: AsyncEngine, wait_seconds: float = _LOCK_WAIT_SECONDS
) -> AsyncConnection:
    """Claim the right to be the only backend instance, or refuse to start.

    Rooms live in-process, so two instances would hold two divergent documents
    for one praxis and flush both to ``body_text`` (ADR-0073, which also states
    the constraint ADR-0012's lazy-on-access timeout depends on).

    A startup *assertion* cannot express this: a process cannot see its own
    replica count, so two replicas would each pass their own check happily. A
    session-level advisory lock is held by one database session at a time, so a
    second instance — however it arose: a Render setting, a stray local
    ``uvicorn``, a deploy overlap — fails loudly instead. The cost is one pooled
    connection held for the life of the process.

    It retries for ``wait_seconds`` first, because the commonest way to meet
    this lock is not a second instance at all: a restarted container can beat
    the database's notice that the *previous* one's session is gone, and a
    service that crash-looped on its own predecessor's ghost would be a worse
    failure than the one this prevents.

    Returns:
        The connection holding the lock. Keep it; closing it releases the lock.

    Raises:
        RuntimeError: if another live session still holds the lock.
    """
    deadline = anyio.current_time() + wait_seconds
    while True:
        connection = await engine.connect()
        acquired = await connection.scalar(
            select(func.pg_try_advisory_lock(_SINGLE_INSTANCE_LOCK_KEY))
        )
        # Commit so the connection does not sit idle-in-transaction for the
        # life of the process. The lock is session-scoped and outlives the
        # transaction.
        await connection.commit()
        if acquired:
            return connection

        await connection.close()
        if anyio.current_time() >= deadline:
            raise RuntimeError(
                "Another World Zero backend instance already holds the single-instance "
                "lock on this database. Praxis rooms live in-process (ADR-0073), so a "
                "second instance would diverge one praxis into two documents. Refusing "
                "to start."
            )
        logger.warning(
            "Single-instance lock is held by another session; retrying for up to %.0fs",
            wait_seconds,
        )
        await anyio.sleep(_LOCK_RETRY_SECONDS)
