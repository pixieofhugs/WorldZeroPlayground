"""A praxis is written in a room, and the room is not the record (ADR-0073).

A room is a server-held CRDT document plus its connected members, mounted as an
ASGI WebSocket route in this app (``main.py``). Server-side rules:

1. **The server seeds the document exactly once** from ``body_text``; clients
   never seed (two seeds = duplicated text, the Yjs footgun). ``_open_lock``
   and the Y-store keep it "once".
2. **Persisted to Postgres** via :class:`PostgresYStore`, with squashing.
3. **The room is the only writer of the body** (#1743): ``title``/``body_text``
   are derived, copied one-way by :class:`_RoomFlusher`.
4. **Two auth doors**: at connect, ``Origin`` by hand (CORS doesn't cover
   WebSockets) plus the member check; on kick/leave, the socket is closed.
5. **Exactly one backend instance** (:func:`acquire_single_instance_lock`).
6. **Writable in every member-reachable status** (ADR-0079). Document movement
   is ADR-0012's edit event, raised from :meth:`_RoomFlusher.write`; the rule is
   ``collab_consensus.on_room_edit``. Awareness never moves the document.
7. **Publishing destroys the document** (privacy: CRDT tombstones keep deleted
   text; squashing doesn't purge the raw tail). Flattened into ``body_text``
   first.
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
from pycrdt import Decoder, Doc, Map, Text, YMessageType, read_message
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
from models.praxis import Praxis
from models.praxis_room import PraxisRoomUpdate
from services.auth import decode_jwt
from services.character import resolve_active_character

logger = logging.getLogger(__name__)

# Co-edited body root type; CodeMirror binds to it (#1742).
ROOM_BODY_KEY = "body"

# Title is one last-write-wins map key, not co-edited text (ADR-0073). Never
# seeded, so absence means "no room value yet", not "empty".
ROOM_META_KEY = "meta"
ROOM_TITLE_KEY = "title"

# Quiet time before copying into the praxis. Updates are already durable; this
# only delays read surfaces.
_FLUSH_DEBOUNCE_SECONDS = 2.0

# Path below the ``main.py`` mount (``/rooms`` prefix belongs to the mount).
_ROOM_PATH = re.compile(r"^/praxis/(?P<praxis_id>\d+)/?$")

# RFC 6455 policy violation = "do not come back"; the only close code sent.
# ``roomReconnect.ts`` stops redialling on it (#1804).
_WS_POLICY_VIOLATION = 1008

_DISCONNECTED: dict[str, Any] = {"type": "websocket.disconnect", "code": 1000}

# Fold a document's stored updates into one once it has more rows than this.
#
# ponytail: a plain row count, folded inside the writing transaction. The
# ceiling is document size (one big rewrite); upgrade to checkpoint rows plus a
# tail of updates, like pycrdt's SQLiteYStore.
_SQUASH_UPDATES_ABOVE = 200

# Session-level advisory lock key; arbitrary, readable in ``pg_locks``.
_SINGLE_INSTANCE_LOCK_KEY = 17400073
_LOCK_WAIT_SECONDS = 30.0
_LOCK_RETRY_SECONDS = 2.0

SessionFactory = Callable[[], AbstractAsyncContextManager[AsyncSession]]


def room_name_for(praxis_id: int) -> str:
    """The room key for a praxis — also the Y-store document path."""
    return f"praxis:{praxis_id}"


def _praxis_id_of(room_name: str) -> int:
    return int(room_name.split(":", 1)[1])


def _document_values(document: Doc) -> dict[str, str]:
    """The praxis columns this document sources; shared by flush and publish."""
    values: dict[str, str] = {"body_text": str(document.get(ROOM_BODY_KEY, type=Text))}
    title = document.get(ROOM_META_KEY, type=Map).get(ROOM_TITLE_KEY)
    # Absent = no room title yet, never "cleared"; else every body edit blanks it.
    if isinstance(title, str):
        values["title"] = title
    return values


class PostgresYStore(BaseYStore):
    """A ``BaseYStore`` over ``praxis_room_update``.

    ``read`` raising ``YDocNotFound`` is how ``_load_or_seed`` knows to seed.
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
            # Columns, not entities: identity-map rows may lack ``created_at``.
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


class _RoomFlusher:
    """Copies one room's document into ``praxis.title`` / ``praxis.body_text``.

    The only writer of those columns (#1743). One-way: reading them back would
    be a second seed.
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
        """Flush once quiet for the whole debounce window (trailing edge)."""
        with anyio.CancelScope() as cancel_scope:
            self._cancel_scope = cancel_scope
            while True:
                await self._changed.wait()
                # Re-armed before the sleep: a keystroke restarts the window.
                self._changed = Event()
                await anyio.sleep(self._debounce_seconds)
                if self._changed.is_set():
                    continue
                await self.write()

    async def close(self) -> None:
        """Stop, after one last flush if the room stopped mid-window."""
        if self._cancel_scope is not None:
            self._cancel_scope.cancel()
        if self._pending:
            await self.write()

    def abandon(self) -> None:
        """Stop without the closing flush; for the publish-time discard only (#1745),
        which already wrote the document inside its own transaction.
        """
        self._pending = False
        if self._cancel_scope is not None:
            self._cancel_scope.cancel()

    async def write(self) -> None:
        """One UPDATE from the current document, plus the edit event (ADR-0079).

        Core statement, not ORM: relationships are ``lazy='raise'``. Triggered
        here, not on inbound messages, because awareness never reaches ``ydoc``
        and :meth:`abandon` keeps a seal from cancelling its own proposal. Same
        transaction as ``on_room_edit`` so text and countdown can't diverge.
        """
        values = _document_values(self._room.ydoc)

        async with self._session_factory() as session:
            await session.execute(
                sql_update(Praxis).where(Praxis.id == self._praxis_id).values(**values)
            )
            # Deferred: collab_consensus imports this module.
            from services.collab_consensus import on_room_edit

            await on_room_edit(self._praxis_id, session)
            await session.commit()
        # Only after commit, so a cancelled write still flushes on close.
        self._pending = False


def _header(scope: dict[str, Any], name: str) -> str | None:
    wanted = name.encode("latin-1")
    for key, value in scope.get("headers", []):
        if key.lower() == wanted:
            return value.decode("latin-1")
    return None


def origin_allowed(origin: str | None) -> bool:
    """Door one's ``Origin`` check, against the CORS allowlist.

    Missing ``Origin`` fails closed (browsers always send it; CSWSH is
    browser-only). Test clients set ``ROOM_ALLOW_MISSING_ORIGIN``.
    """
    if origin is None:
        return settings.ROOM_ALLOW_MISSING_ORIGIN
    return origin in settings.cors_origins


def _access_token(cookie_header: str | None) -> str | None:
    """The ``access_token`` cookie; the browser sends it on the handshake (ADR-0073)."""
    if not cookie_header:
        return None
    cookies: SimpleCookie = SimpleCookie()
    try:
        cookies.load(cookie_header)
    except CookieError:
        return None
    morsel = cookies.get("access_token")
    return morsel.value if morsel is not None else None


class _RoomConnection:
    """One open socket and its character; the library can't map sockets to members."""

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
        #: Awareness IDs this socket announced, so a drop clears its caret
        #: instead of waiting y-protocols' 30 s timeout (#3211).
        self.awareness_ids: set[int] = set()
        self._raw_receive = receive
        self._revoke_event = Event()
        self.channel = ASGIWebsocket(self._receive, send, self.room_name)

    def revoke(self) -> None:
        """End this socket. Safe from any task: it only sets an event.

        The serving task is the socket's one writer; waking its ``receive`` with
        a disconnect unwinds it, and it closes 1008 on the way out.
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
        self._note_awareness(received.get("bytes"))
        return received

    def _note_awareness(self, frame: bytes | None) -> None:
        """Remember the client IDs an inbound awareness frame speaks for."""
        if not frame or frame[0] != YMessageType.AWARENESS:
            return
        try:
            decoder = Decoder(read_message(frame[1:]))
            for _ in range(decoder.read_var_uint()):
                self.awareness_ids.add(decoder.read_var_uint())
                decoder.read_var_uint()  # clock
                decoder.read_var_string()  # state
        except Exception:  # noqa: BLE001 - the room's own handler owns bad frames
            return


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
            # :meth:`release` drops rooms under the open lock; the base clean-up
            # races a mid-seed connect.
            auto_clean_rooms=False,
            log=log or logger,
        )
        self._session_factory = session_factory
        self._squash_updates_above = squash_updates_above
        self._flush_debounce_seconds = flush_debounce_seconds
        self._connections: set[_RoomConnection] = set()
        self._flushers: dict[str, _RoomFlusher] = {}
        self.__open_lock: Lock | None = None

    @property
    def _open_lock(self) -> Lock:
        # Lazy: the singleton is built at import, outside any event loop.
        if self.__open_lock is None:
            self.__open_lock = Lock()
        return self.__open_lock

    async def get_room(self, name: str) -> YRoom:
        """Open the room for ``name``, seeding it once if new — all under one lock
        so two simultaneous connects can't both seed.
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
            room.ready = True
            return room

    def _start_flusher(self, room: YRoom, name: str) -> None:
        """Copy document changes into the praxis (#1743); subscribed after the seed."""
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
        # Explicit: the room's update observer isn't subscribed until ready.
        await store.write(room.ydoc.get_update())
        self.log.info("Seeded praxis room %s from body_text", name)

    def register(self, connection: _RoomConnection) -> None:
        self._connections.add(connection)

    async def release(self, connection: _RoomConnection) -> None:
        """Forget a socket, and drop its room once nobody is left in it."""
        self._connections.discard(connection)
        # Shielded: runs in a ``finally`` a disconnect may have cancelled.
        with anyio.CancelScope(shield=True):
            async with self._open_lock:
                room = self.rooms.get(connection.room_name)
                if room is not None and connection.awareness_ids:
                    # Drops send no awareness disconnect; "local" is broadcast.
                    room.awareness.remove_awareness_states(
                        list(connection.awareness_ids), "local"
                    )
                if room is not None and not room.clients:
                    flusher = self._flushers.pop(connection.room_name, None)
                    if flusher is not None:
                        await flusher.close()
                    await self.delete_room(room=room)

    async def discard_document(self, praxis: Praxis, session: AsyncSession) -> None:
        """Publish: the document becomes the record, and is then destroyed (#1745).

        Room stopped before its rows are deleted, all under ``_open_lock``, so
        nothing can write back or re-seed. Written via the entity (not Core) so
        the caller's sealed response isn't stale. All sockets are revoked, or a
        client's old doc would merge into the next seed (duplication).
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

    def revoke(self, praxis_id: int, character_id: int) -> None:
        """Door two: close every socket this character holds on this praxis."""
        for connection in list(self._connections):
            if (
                connection.praxis_id == praxis_id
                and connection.character_id == character_id
            ):
                connection.revoke()

    async def authorize(self, scope: dict[str, Any], praxis_id: int) -> int | None:
        """Door one: the character id, or ``None`` for any refusal (no leak)."""
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
            # The one membership rule (ADR-0013); deferred, praxis imports us.
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

    Overrides the WebSocket branch since ``on_connect`` never sees the channel.
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
            # WebSockets only; a plain GET is a 404, not a hang.
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

        # Not ``scope["path"]``: Mount passes the full path, prefix in
        # ``root_path`` (#1740).
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

    async def _refuse(
        self,
        send: Callable[[dict[str, Any]], Any],
        code: int = _WS_POLICY_VIOLATION,
    ) -> None:
        """Close the socket on policy grounds — before accept, or after revoke."""
        try:
            await send({"type": "websocket.close", "code": code})
        except Exception:  # pragma: no cover — the client may already be gone
            logger.debug("Praxis room socket already closed", exc_info=True)


PRAXIS_ROOM_SERVER = PraxisRoomServer()
PRAXIS_ROOM_APP = PraxisRoomASGIServer(PRAXIS_ROOM_SERVER)


async def discard_room_document(praxis: Praxis, session: AsyncSession) -> None:
    """Flatten the document into the praxis, then destroy it; seal's txn (#1745)."""
    await PRAXIS_ROOM_SERVER.discard_document(praxis, session)


def close_member_sockets(praxis_id: int, character_id: int) -> None:
    """Door two, for kick and leave. Pre-commit; a rollback just costs a reconnect."""
    PRAXIS_ROOM_SERVER.revoke(praxis_id, character_id)


async def acquire_single_instance_lock(
    engine: AsyncEngine, wait_seconds: float = _LOCK_WAIT_SECONDS
) -> AsyncConnection:
    """Claim the right to be the only backend instance, or refuse to start.

    Rooms are in-process, so two instances would diverge documents (ADR-0073).
    A session advisory lock catches any second instance; costs one connection.
    Retries for ``wait_seconds`` since a restart can beat the DB noticing the
    previous session died.

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
        # Avoid idle-in-transaction; the session lock outlives it.
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
