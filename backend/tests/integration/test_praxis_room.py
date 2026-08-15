"""The praxis room, driven by real ``pycrdt`` clients (#1740, ADR-0073).

**The seam is the room's ASGI app.** Every rule this issue adds — seed once,
both auth doors, persistence across a restart — is a server rule precisely so
that it can be tested here rather than through a browser: the frontend harness
runs in the ``node`` environment with no DOM, and e2e is deliberately not
PR-blocking.

So these tests speak ASGI on one side of the socket and pycrdt's ``Channel``
protocol on the other, with no network and no uvicorn, and drive genuine
``pycrdt.Provider`` clients at the mounted app. A test that stubbed the CRDT
would prove nothing about the one bug this issue exists to prevent: two clients
each seeding a document from the same text and merging into two copies of it.
"""

import asyncio
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Callable

import pytest
import pytest_asyncio
from pycrdt import Doc, Map, Provider, Text
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import services.praxis_room as praxis_room
from config import settings
from main import app as fastapi_app
from models.character import Character
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.praxis_room import PraxisRoomUpdate
from models.task import Task
from services.auth import create_jwt
from services.praxis import (
    kick_member,
    leave_praxis,
    submit_praxis,
    unsubmit_praxis,
)
from services.praxis_room import (
    ROOM_BODY_KEY,
    ROOM_META_KEY,
    ROOM_TITLE_KEY,
    PraxisRoomASGIServer,
    PraxisRoomServer,
    acquire_single_instance_lock,
    room_name_for,
)

SEED_BODY = "The seeded body of one praxis."
ALLOWED_ORIGIN = settings.cors_origins[0]
_TIMEOUT_SECONDS = 5.0

#: The mount ``main.py`` puts the room app behind, read off the live app rather
#: than restated here — the prefix is the mount's to own, and a test holding its
#: own copy of it would keep passing after the mount moved.
ROOM_MOUNT = next(
    route for route in fastapi_app.routes if getattr(route, "name", None) == "praxis-rooms"
)


def mounted_room_path(praxis_id: int) -> str:
    """The URL a browser opens — what the *outermost* app is asked for."""
    return f"{ROOM_MOUNT.path}/praxis/{praxis_id}"


# ---------------------------------------------------------------------------
# One socket, in memory
# ---------------------------------------------------------------------------


class _Socket:
    """Both ends of one WebSocket: ASGI for the app, ``Channel`` for the client."""

    def __init__(self, path: str) -> None:
        self.path = path
        self.accepted = asyncio.Event()
        self.closed = asyncio.Event()
        self.close_code: int | None = None
        self._to_app: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._to_client: asyncio.Queue[bytes | None] = asyncio.Queue()

    # -- the ASGI side ----------------------------------------------------

    async def receive(self) -> dict[str, Any]:
        return await self._to_app.get()

    async def send(self, message: dict[str, Any]) -> None:
        if message["type"] == "websocket.accept":
            self.accepted.set()
        elif message["type"] == "websocket.send":
            await self._to_client.put(message["bytes"])
        elif message["type"] == "websocket.close":
            self.close_code = message.get("code")
            self.closed.set()
            await self._to_client.put(None)

    # -- the client side --------------------------------------------------

    def __aiter__(self) -> "_Socket":
        return self

    async def __anext__(self) -> bytes:
        return await self.recv()

    async def send_bytes(self, message: bytes) -> None:
        await self._to_app.put({"type": "websocket.receive", "bytes": message})

    async def recv(self) -> bytes:
        message = await self._to_client.get()
        if message is None:
            raise StopAsyncIteration()
        return message

    async def disconnect(self) -> None:
        """Hang up the way a closed browser tab does."""
        await self._to_app.put({"type": "websocket.disconnect", "code": 1000})
        await self._to_client.put(None)

    async def connect(self) -> None:
        await self._to_app.put({"type": "websocket.connect"})


class _ChannelAdapter:
    """``_Socket``'s client end, wearing pycrdt's ``Channel`` shape."""

    def __init__(self, socket: _Socket) -> None:
        self._socket = socket

    @property
    def path(self) -> str:
        return self._socket.path

    def __aiter__(self) -> "_ChannelAdapter":
        return self

    async def __anext__(self) -> bytes:
        return await self._socket.recv()

    async def send(self, message: bytes) -> None:
        await self._socket.send_bytes(message)

    async def recv(self) -> bytes:
        return await self._socket.recv()


class _SharedSessionFactory:
    """Hand the room the test's SAVEPOINT-backed session, one caller at a time.

    The room reads ``praxis.body_text`` and writes its store on its own tasks,
    which would otherwise use this ``AsyncSession`` concurrently with the test
    body. A lock is enough because every room-side block is short.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._lock = asyncio.Lock()

    def __call__(self) -> Any:
        return self._context()

    @asynccontextmanager
    async def _context(self) -> AsyncIterator[AsyncSession]:
        async with self._lock:
            yield self._session


class _Rooms:
    """A running room server plus the ASGI app in front of it."""

    def __init__(
        self, server: PraxisRoomServer, sessions: _SharedSessionFactory
    ) -> None:
        self.server = server
        self.app = PraxisRoomASGIServer(server)
        #: The room's own session factory. A test that reads the database while
        #: rooms are running MUST go through this rather than touching
        #: ``db_session`` directly: one savepoint-backed session serves both
        #: sides here, and using it from two tasks at once raises
        #: "concurrent operations are not permitted" out of a room task, where
        #: it reads as a room bug rather than as the harness bug it is.
        self.sessions = sessions
        self._tasks: list[asyncio.Task] = []

    async def open(
        self,
        praxis_id: int,
        account_id: int | None,
        *,
        origin: str | None = ALLOWED_ORIGIN,
        path: str | None = None,
        raw_token: str | None = None,
        through: Any | None = None,
    ) -> _Socket:
        """Start a handshake. Returns once the app has accepted or refused it.

        ``through`` drives some other ASGI app than the room's own — in practice
        the whole FastAPI app, so that the handshake goes through the **mount**
        (see :func:`mounted_room_path`). Passing it means passing ``path`` too:
        a browser asks for the mounted URL, prefix and all.
        """
        socket = _Socket(path or f"/praxis/{praxis_id}")
        headers: list[tuple[bytes, bytes]] = [(b"host", b"api.worldzero.test")]
        if origin is not None:
            headers.append((b"origin", origin.encode()))
        token = raw_token or (None if account_id is None else create_jwt(account_id))
        if token is not None:
            headers.append((b"cookie", f"access_token={token}".encode()))
        scope = {
            "type": "websocket",
            "path": socket.path,
            "raw_path": socket.path.encode(),
            "query_string": b"",
            "scheme": "ws",
            # As a server hands it to the outermost app: empty, and grown by
            # each mount on the way down.
            "root_path": "",
            "headers": headers,
        }

        self._tasks.append(
            asyncio.create_task(
                (through or self.app)(scope, socket.receive, socket.send)
            )
        )
        await socket.connect()
        await _wait_for(
            lambda: socket.accepted.is_set() or socket.closed.is_set(),
            "handshake to settle",
        )
        return socket

    def room_doc(self, praxis_id: int) -> Doc | None:
        room = self.server.rooms.get(room_name_for(praxis_id))
        return None if room is None else room.ydoc

    async def aclose(self) -> None:
        for task in self._tasks:
            task.cancel()
        for task in self._tasks:
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass


@asynccontextmanager
async def running_rooms(
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    squash_updates_above: int = 200,
    flush_debounce_seconds: float = 2.0,
) -> AsyncIterator[_Rooms]:
    """A room server for one test, standing in for the module singleton.

    ``services.praxis`` reaches the running server through the module global on
    every call, so patching it here is what puts the kick/leave revoke door
    under test rather than a copy of it.
    """
    sessions = _SharedSessionFactory(db_session)
    server = PraxisRoomServer(
        session_factory=sessions,
        squash_updates_above=squash_updates_above,
        flush_debounce_seconds=flush_debounce_seconds,
    )
    monkeypatch.setattr(praxis_room, "PRAXIS_ROOM_SERVER", server)
    # The *mounted* app holds its own reference to the server it was built
    # with, so patching the module global alone would leave a handshake driven
    # through ``main.app`` talking to the process-wide server — and to the
    # process-wide database session.
    monkeypatch.setattr(praxis_room.PRAXIS_ROOM_APP, "rooms", server)
    rooms = _Rooms(server, sessions)
    async with server:
        try:
            yield rooms
        finally:
            await rooms.aclose()


@asynccontextmanager
async def client_doc(socket: _Socket) -> AsyncIterator[Doc]:
    """A real pycrdt client synchronizing over ``socket``.

    Note what it does *not* do: it never seeds. The document starts empty and
    everything in it arrives from the server.
    """
    doc = Doc()
    async with Provider(doc, _ChannelAdapter(socket)):
        yield doc


async def _wait_for(predicate: Callable[[], bool], description: str) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + _TIMEOUT_SECONDS
    while loop.time() < deadline:
        if predicate():
            return
        await asyncio.sleep(0.01)
    raise AssertionError(f"timed out waiting for {description}")


def _body(doc: Doc) -> str:
    return str(doc.get(ROOM_BODY_KEY, type=Text))


async def _wait_for_body(doc: Doc, expected: str, who: str) -> None:
    await _wait_for(lambda: _body(doc) == expected, f"{who} to hold {expected!r}")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def collab(
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
) -> Praxis:
    """An open collab with two members and a body worth seeding from."""
    praxis = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.collab,
        status=PraxisStatus.in_progress,
        title="Collab Praxis",
        body_text=SEED_BODY,
    )
    db_session.add(praxis)
    await db_session.flush()
    db_session.add_all(
        [
            PraxisMember(praxis_id=praxis.id, character_id=character.id),
            PraxisMember(praxis_id=praxis.id, character_id=character2.id),
        ]
    )
    await db_session.commit()
    await db_session.refresh(praxis)
    return praxis


# ---------------------------------------------------------------------------
# Seeding — the rule this issue exists for
# ---------------------------------------------------------------------------


async def test_first_client_receives_the_seeded_body(
    db_session, collab, account, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account.id)
        assert socket.accepted.is_set()
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")


async def test_second_client_does_not_duplicate_the_seed(
    db_session, collab, account, account2, monkeypatch
) -> None:
    """The footgun, cornered: a client joining an open room seeds nothing.

    If the room seeded per client, the second connection's document would merge
    into ``SEED_BODY * 2`` — and so would the first client's, which is what
    makes this the failure nobody notices until a player watches their praxis
    double.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        first = await rooms.open(collab.id, account.id)
        async with client_doc(first) as first_doc:
            await _wait_for_body(first_doc, SEED_BODY, "the first client")

            second = await rooms.open(collab.id, account2.id)
            async with client_doc(second) as second_doc:
                await _wait_for_body(second_doc, SEED_BODY, "the second client")
                assert _body(first_doc) == SEED_BODY
                assert _body(rooms.room_doc(collab.id)) == SEED_BODY


async def test_simultaneous_first_connections_seed_once(
    db_session, collab, account, account2, monkeypatch
) -> None:
    """Two members opening the composer at the same instant still seed once.

    Without a lock around "is there a room? then seed it", both handshakes find
    no room, both seed, and the two documents merge into two bodies.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        first, second = await asyncio.gather(
            rooms.open(collab.id, account.id),
            rooms.open(collab.id, account2.id),
        )
        async with client_doc(first) as first_doc, client_doc(second) as second_doc:
            await _wait_for_body(first_doc, SEED_BODY, "the first client")
            await _wait_for_body(second_doc, SEED_BODY, "the second client")
            assert _body(rooms.room_doc(collab.id)) == SEED_BODY


async def test_two_clients_editing_converge(
    db_session, collab, account, account2, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        first = await rooms.open(collab.id, account.id)
        second = await rooms.open(collab.id, account2.id)
        async with client_doc(first) as first_doc, client_doc(second) as second_doc:
            await _wait_for_body(first_doc, SEED_BODY, "the first client")
            await _wait_for_body(second_doc, SEED_BODY, "the second client")

            first_doc.get(ROOM_BODY_KEY, type=Text).insert(0, "one ")
            await _wait_for_body(second_doc, f"one {SEED_BODY}", "the second client")

            second_doc.get(ROOM_BODY_KEY, type=Text).insert(0, "two ")
            expected = f"two one {SEED_BODY}"
            await _wait_for_body(first_doc, expected, "the first client")
            await _wait_for_body(second_doc, expected, "the second client")


async def test_document_survives_a_room_restart(
    db_session, collab, account, monkeypatch
) -> None:
    """A room dies with its last client; the document does not — and does not double."""
    async with running_rooms(db_session, monkeypatch) as rooms:
        first = await rooms.open(collab.id, account.id)
        async with client_doc(first) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "kept ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"kept {SEED_BODY}", "the room"
            )
        await first.disconnect()
        await _wait_for(
            lambda: rooms.room_doc(collab.id) is None, "the empty room to be dropped"
        )

        rejoined = await rooms.open(collab.id, account.id)
        async with client_doc(rejoined) as doc:
            await _wait_for_body(doc, f"kept {SEED_BODY}", "the rejoining client")


# ---------------------------------------------------------------------------
# Door one — at connect
# ---------------------------------------------------------------------------


async def test_non_member_socket_is_rejected(
    db_session, collab, account3, character3, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account3.id)
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_socket_without_a_cookie_is_rejected(
    db_session, collab, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, None)
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_foreign_origin_is_rejected(
    db_session, collab, account, monkeypatch
) -> None:
    """A member's own cookie is not enough from someone else's page.

    ``CORSMiddleware`` does not see WebSockets, so this check is the only thing
    standing between a cookie-authed socket and cross-site hijacking.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(
            collab.id, account.id, origin="https://evil.example"
        )
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_missing_origin_is_rejected_by_default(
    db_session, collab, account, monkeypatch
) -> None:
    assert settings.ROOM_ALLOW_MISSING_ORIGIN is False
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account.id, origin=None)
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_missing_origin_is_allowed_when_configured(
    db_session, collab, account, monkeypatch
) -> None:
    """The one door for non-browser clients, and it is off unless asked for."""
    monkeypatch.setattr(settings, "ROOM_ALLOW_MISSING_ORIGIN", True)
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account.id, origin=None)
        assert socket.accepted.is_set()


async def test_socket_with_an_unreadable_token_is_rejected(
    db_session, collab, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, None, raw_token="not-a-jwt")
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_socket_for_an_unknown_praxis_is_rejected(
    db_session, collab, account, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id + 10_000, account.id)
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_unknown_path_is_rejected(db_session, collab, account, monkeypatch) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account.id, path="/praxis/not-a-number")
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


# ---------------------------------------------------------------------------
# The mount — how a browser actually reaches door one
# ---------------------------------------------------------------------------
#
# Every test above hands the room app a scope it built itself, with the path
# the mount was assumed to leave behind. It does not: Starlette's ``Mount``
# sets ``root_path`` on the child scope and never touches ``path``, so the room
# app is really asked for ``/rooms/praxis/12``. Reading the raw path refused
# every handshake in production while the suite stayed green, because nothing
# in it went through ``main.app``. These do.


async def test_member_handshake_through_the_mount_is_accepted(
    db_session, collab, account, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(
            collab.id,
            account.id,
            path=mounted_room_path(collab.id),
            through=fastapi_app,
        )
        assert socket.accepted.is_set()
        assert not socket.closed.is_set()
        # Accepted is not the same as served, and the outage's symptom was a
        # composer nobody could type in — so the document has to arrive too.
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "a client behind the mount")


async def test_non_member_handshake_through_the_mount_is_refused(
    db_session, collab, account3, character3, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(
            collab.id,
            account3.id,
            path=mounted_room_path(collab.id),
            through=fastapi_app,
        )
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_foreign_origin_handshake_through_the_mount_is_refused(
    db_session, collab, account, monkeypatch
) -> None:
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(
            collab.id,
            account.id,
            origin="https://evil.example",
            path=mounted_room_path(collab.id),
            through=fastapi_app,
        )
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_missing_origin_handshake_through_the_mount_is_refused(
    db_session, collab, account, monkeypatch
) -> None:
    assert settings.ROOM_ALLOW_MISSING_ORIGIN is False
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(
            collab.id,
            account.id,
            origin=None,
            path=mounted_room_path(collab.id),
            through=fastapi_app,
        )
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


# ---------------------------------------------------------------------------
# Door two — at revoke
# ---------------------------------------------------------------------------


async def test_kicked_member_socket_is_closed(
    db_session, collab, account, account2, character, character2, monkeypatch
) -> None:
    """Membership is checked at connect, so removal has to reach the open socket."""
    async with running_rooms(db_session, monkeypatch) as rooms:
        kickee = await rooms.open(collab.id, account2.id)
        async with client_doc(kickee) as doc:
            await _wait_for_body(doc, SEED_BODY, "the member about to be kicked")

            await kick_member(collab.id, character2.id, character.id, db_session)

            await _wait_for(kickee.closed.is_set, "the kicked member's socket to close")
            assert kickee.close_code == 1008


async def test_leaving_member_socket_is_closed(
    db_session, collab, account2, character2, monkeypatch
) -> None:
    """The other half of door two — leaving is a removal too."""
    async with running_rooms(db_session, monkeypatch) as rooms:
        leaver = await rooms.open(collab.id, account2.id)
        async with client_doc(leaver) as doc:
            await _wait_for_body(doc, SEED_BODY, "the member about to leave")

            await leave_praxis(collab.id, character2.id, db_session)

            await _wait_for(leaver.closed.is_set, "the leaver's socket to close")
            assert leaver.close_code == 1008


# ---------------------------------------------------------------------------
# Exactly one instance
# ---------------------------------------------------------------------------


async def test_a_second_instance_refuses_to_start(test_engine) -> None:
    """Rooms live in-process, so the second instance must fail loudly.

    Not a bare assertion: a process cannot see its own replica count, so this
    has to be a lock two *sessions* contend for (ADR-0073).
    """
    held = await acquire_single_instance_lock(test_engine)
    try:
        with pytest.raises(RuntimeError, match="single-instance"):
            await acquire_single_instance_lock(test_engine, wait_seconds=0)
    finally:
        await held.close()

    # ...and the lock is released with the connection, so a redeploy can start.
    reacquired = await acquire_single_instance_lock(test_engine)
    await reacquired.close()


async def test_the_lock_waits_out_a_departing_predecessor(
    test_engine, monkeypatch
) -> None:
    """A restart must not crash-loop on the previous container's dying session."""
    monkeypatch.setattr(praxis_room, "_LOCK_RETRY_SECONDS", 0.05)
    predecessor = await acquire_single_instance_lock(test_engine)

    async def let_go() -> None:
        await asyncio.sleep(0.1)
        await predecessor.close()

    release = asyncio.create_task(let_go())
    successor = await acquire_single_instance_lock(test_engine, wait_seconds=5)
    await release
    await successor.close()


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


async def test_store_squashes_its_history_losslessly(db_session, collab) -> None:
    """A Y store appends forever unless something folds it up.

    Driven straight at the store, with no room in the way: the policy is about
    rows, and asserting on rows through a socket would be a timing test.
    """
    store = praxis_room.PostgresYStore(
        room_name_for(collab.id),
        session_factory=_SharedSessionFactory(db_session),
        squash_updates_above=2,
    )
    doc = Doc()
    # Observing from before the seed, so the stored history is the whole
    # document — exactly what a room writes.
    updates: list[bytes] = []
    doc.observe(lambda event: updates.append(event.update))
    body = Text(SEED_BODY)
    doc[ROOM_BODY_KEY] = body
    for index in range(6):
        body.insert(0, f"{index} ")

    for update in updates:
        await store.write(update)
    assert len(updates) == 7

    assert await _update_count(db_session, collab.id) <= 3

    restored = Doc()
    await store.apply_updates(restored)
    assert str(restored.get(ROOM_BODY_KEY, type=Text)) == str(body)


async def _update_count(session: AsyncSession, praxis_id: int) -> int:
    return await session.scalar(
        select(func.count())
        .select_from(PraxisRoomUpdate)
        .where(PraxisRoomUpdate.praxis_id == praxis_id)
    )


# ---------------------------------------------------------------------------
# The flush — the room is the only way a body is written (#1743)
# ---------------------------------------------------------------------------


async def _record(rooms: _Rooms, praxis_id: int) -> tuple[str | None, str | None]:
    """``(title, body_text)`` straight from the row, past any identity map."""
    async with rooms.sessions() as session:
        row = (
            await session.execute(
                select(Praxis.title, Praxis.body_text).where(Praxis.id == praxis_id)
            )
        ).one()
    return row[0], row[1]


async def _wait_for_record(
    rooms: _Rooms,
    praxis_id: int,
    description: str,
    *,
    title: str | None = None,
    body_text: str | None = None,
) -> None:
    """Poll the row until the named columns match. Only what is passed is checked."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + _TIMEOUT_SECONDS
    while True:
        stored_title, stored_body = await _record(rooms, praxis_id)
        if (title is None or stored_title == title) and (
            body_text is None or stored_body == body_text
        ):
            return
        if loop.time() >= deadline:
            raise AssertionError(
                f"timed out waiting for {description}: the row holds "
                f"title={stored_title!r} body_text={stored_body!r}"
            )
        await asyncio.sleep(0.02)


async def test_an_edit_in_a_room_lands_in_body_text(
    db_session, collab, account, monkeypatch
) -> None:
    """The whole point of #1743: no ``PUT``, and the praxis is still written."""
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "typed ")
            await _wait_for_record(
                rooms,
                collab.id,
                "the debounced flush",
                body_text=f"typed {SEED_BODY}",
            )


async def test_a_non_creator_members_edit_reaches_the_record(
    db_session, collab, account2, monkeypatch
) -> None:
    """Any member may edit, creator or not (ADR-0013) — inherited from the ``PUT``.

    The membership rule has one implementation, ``_require_member(.., "edit")``,
    and door one calls it: the rule moved to the room's handshake rather than
    being copied there. ``account2`` is a member of ``collab`` and did not
    create it, which is the case ``test_collab_non_creator_can_edit`` used to
    make against the retired endpoint.
    """
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        socket = await rooms.open(collab.id, account2.id)
        assert socket.accepted.is_set()
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the non-creator member")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "theirs too ")
            await _wait_for_record(
                rooms,
                collab.id,
                "the non-creator's flush",
                body_text=f"theirs too {SEED_BODY}",
            )


async def test_flushed_body_text_is_the_markdown_the_document_holds(
    db_session, collab, account, monkeypatch
) -> None:
    """``body_text`` stays markdown, byte for byte (ADR-0073).

    Praxis detail, the feed, search and every ``react-markdown`` reader read
    this column, and this epic deliberately changes none of them. A flush that
    normalized whitespace, trimmed, or re-wrapped would change all of them at
    once, and no assertion about the socket would notice.
    """
    markdown = "# A heading\n\n- one\n- two\n\n> quoted  \n\n**bold** and `code`\n"
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            body = doc.get(ROOM_BODY_KEY, type=Text)
            await _wait_for_body(doc, SEED_BODY, "the first client")
            del body[0 : len(SEED_BODY)]
            body.insert(0, markdown)
            await _wait_for_record(
                rooms, collab.id, "the flush", body_text=markdown
            )
            _, stored = await _record(rooms, collab.id)
            assert stored == str(body)


async def test_two_clients_editing_converge_into_one_body_text(
    db_session, collab, account, account2, monkeypatch
) -> None:
    """Concurrent edits converge; they do not clobber.

    This is the defect the ADR exists for. Under the retired ``PUT`` the second
    writer's text simply replaced the first's with no signal to either of them,
    so what matters is that BOTH insertions survive in the column — not merely
    that the column changed.
    """
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        first = await rooms.open(collab.id, account.id)
        second = await rooms.open(collab.id, account2.id)
        async with client_doc(first) as first_doc, client_doc(second) as second_doc:
            await _wait_for_body(first_doc, SEED_BODY, "the first client")
            await _wait_for_body(second_doc, SEED_BODY, "the second client")

            first_doc.get(ROOM_BODY_KEY, type=Text).insert(0, "one ")
            second_doc.get(ROOM_BODY_KEY, type=Text).insert(len(SEED_BODY), " two")

            await _wait_for(
                lambda: _body(first_doc) == _body(second_doc)
                and "one " in _body(first_doc)
                and " two" in _body(first_doc),
                "both clients to converge",
            )
            converged = _body(first_doc)
            assert SEED_BODY in converged
            await _wait_for_record(
                rooms, collab.id, "the converged flush", body_text=converged
            )


async def test_opening_a_room_alone_leaves_the_record_untouched(
    db_session, collab, account, monkeypatch
) -> None:
    """Open, sync, close. Nothing was typed, so nothing may be rewritten."""
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
        await socket.disconnect()
        await _wait_for(
            lambda: rooms.room_doc(collab.id) is None, "the empty room to be dropped"
        )
    assert await _record(rooms, collab.id) == ("Collab Praxis", SEED_BODY)


async def test_a_praxis_whose_room_never_opened_keeps_its_body_text(
    db_session, collab, account, active_task, character, monkeypatch
) -> None:
    """The neighbouring praxis is not collateral: only the edited room flushes."""
    untouched = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Untouched",
        body_text="Never opened in a room.",
    )
    db_session.add(untouched)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=untouched.id, character_id=character.id))
    await db_session.commit()

    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "edited ")
            await _wait_for_record(
                rooms,
                collab.id,
                "the edited praxis",
                body_text=f"edited {SEED_BODY}",
            )

    assert await _record(rooms, untouched.id) == (
        "Untouched",
        "Never opened in a room.",
    )


async def test_the_title_key_flushes_to_praxis_title(
    db_session, collab, account, monkeypatch
) -> None:
    """The title is one last-write-wins map key, and it reaches the record too.

    Without this the retired ``PUT`` would still be the only way to rename a
    praxis — the second write path the ADR refuses to keep.
    """
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_META_KEY, type=Map)[ROOM_TITLE_KEY] = "A renamed praxis"
            await _wait_for_record(
                rooms,
                collab.id,
                "the title flush",
                title="A renamed praxis",
                body_text=SEED_BODY,
            )


async def test_an_absent_title_key_never_blanks_the_praxis_title(
    db_session, collab, account, monkeypatch
) -> None:
    """Nothing seeds the title key, so absent means "no remote value yet".

    Reading absence as "the title is empty" would blank every praxis the
    instant anybody typed one character of body text.
    """
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "body only ")
            await _wait_for_record(
                rooms,
                collab.id,
                "the flush",
                title="Collab Praxis",
                body_text=f"body only {SEED_BODY}",
            )


async def test_the_last_edit_before_a_room_closes_still_lands(
    db_session, collab, account, monkeypatch
) -> None:
    """A tab closed inside the debounce window must not strand the keystrokes.

    The room's own store keeps them either way, and reopening would show them —
    but ``body_text`` is what every *read* surface reads, and a praxis detail
    page missing the sentence its author typed a minute ago is the visible half
    of "the record is derived". The debounce here is long enough that only the
    closing flush can satisfy this.
    """
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=30.0) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "last words ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"last words {SEED_BODY}", "the room"
            )
        await socket.disconnect()
        await _wait_for_record(
            rooms,
            collab.id,
            "the closing flush",
            body_text=f"last words {SEED_BODY}",
        )


# ---------------------------------------------------------------------------
# The freeze — submitting seals the document (#1745, ADR-0012)
# ---------------------------------------------------------------------------


async def _stored_updates(rooms: _Rooms, praxis_id: int) -> list[bytes]:
    async with rooms.sessions() as session:
        rows = await session.execute(
            select(PraxisRoomUpdate.update)
            .where(PraxisRoomUpdate.praxis_id == praxis_id)
            .order_by(PraxisRoomUpdate.id)
        )
        return list(rows.scalars().all())


async def _every_stored_update(rooms: _Rooms) -> list[bytes]:
    """Every retained document byte in the table, not only this praxis's."""
    async with rooms.sessions() as session:
        rows = await session.execute(select(PraxisRoomUpdate.update))
        return list(rows.scalars().all())


async def _settle() -> None:
    """Long enough that a message which was going to land would have landed."""
    for _ in range(25):
        await asyncio.sleep(0.01)


async def test_a_pending_praxis_refuses_every_member_s_edits(
    db_session, collab, account, account2, character, monkeypatch
) -> None:
    """The freeze is a server rule, and it binds the submitter too.

    The before/after inside one test is the point: the same socket that lands a
    keystroke while the collab is drafting lands nothing once it is pending. A
    test asserting only the second half would pass against a dead transport.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        first = await rooms.open(collab.id, account.id)
        second = await rooms.open(collab.id, account2.id)
        async with client_doc(first) as first_doc, client_doc(second) as second_doc:
            await _wait_for_body(first_doc, SEED_BODY, "the first client")
            await _wait_for_body(second_doc, SEED_BODY, "the second client")

            first_doc.get(ROOM_BODY_KEY, type=Text).insert(0, "drafting ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"drafting {SEED_BODY}", "the room"
            )

            # `character` is `account`'s, so the first client is the submitter.
            await submit_praxis(collab.id, character.id, db_session)
            frozen = f"drafting {SEED_BODY}"

            second_doc.get(ROOM_BODY_KEY, type=Text).insert(0, "holdout ")
            first_doc.get(ROOM_BODY_KEY, type=Text).insert(0, "submitter ")
            await _settle()

            assert _body(rooms.room_doc(collab.id)) == frozen


async def test_pull_back_thaws_the_room_and_clears_the_group_s_consent(
    db_session, collab, account2, character, character2, monkeypatch
) -> None:
    """``pullBack`` is the one door back in, and it is ADR-0012's hard reset.

    Any member may open it — the holdout most of all, because until #1743 they
    reopened the collab simply by typing, and that trigger is gone. Here the
    member who pulls back (``character2``) is not the one who submitted.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        await submit_praxis(collab.id, character.id, db_session)
        reopened = await unsubmit_praxis(collab.id, character2.id, db_session)

        assert reopened.status == PraxisStatus.in_progress
        assert [member.has_submitted for member in reopened.members] == [False, False]
        assert reopened.submit_proposed_at is None

        socket = await rooms.open(collab.id, account2.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the reopening client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "thawed ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"thawed {SEED_BODY}", "the thawed room"
            )


async def test_publishing_discards_the_document_and_keeps_the_body(
    db_session, collab, account, character, character2, monkeypatch
) -> None:
    """The document becomes the record and is then destroyed.

    The debounce is set past the test's life, so only the publish-time flatten
    can put the typed sentence in ``body_text``: a praxis that sealed with the
    room's last words missing would be the visible half of this bug.
    """
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=30.0) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "final ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"final {SEED_BODY}", "the room"
            )
            assert await _stored_updates(rooms, collab.id) != []

            await submit_praxis(collab.id, character.id, db_session)
            published = await submit_praxis(collab.id, character2.id, db_session)

        assert published.status == PraxisStatus.submitted
        assert await _stored_updates(rooms, collab.id) == []
        assert await _record(rooms, collab.id) == ("Collab Praxis", f"final {SEED_BODY}")


async def test_reopening_a_published_praxis_seeds_a_fresh_document_once(
    db_session, collab, account, account2, character, character2, monkeypatch
) -> None:
    """The discard hands ``pullBack`` back to the one server-side seed (#1740).

    The duplication footgun arrives here by a second door: a surviving document
    merged into a freshly seeded one holds the body twice, and it is the same
    body either way, so nothing but this assertion would notice.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "published ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"published {SEED_BODY}", "the room"
            )
            await submit_praxis(collab.id, character.id, db_session)
            await submit_praxis(collab.id, character2.id, db_session)

        await unsubmit_praxis(collab.id, character2.id, db_session)

        rejoined = await rooms.open(collab.id, account2.id)
        async with client_doc(rejoined) as doc:
            await _wait_for_body(doc, f"published {SEED_BODY}", "the rejoining client")
            assert _body(rooms.room_doc(collab.id)) == f"published {SEED_BODY}"


async def test_text_a_member_deleted_does_not_outlive_the_draft(
    db_session, collab, account, character, character2, monkeypatch
) -> None:
    """The privacy half: a CRDT keeps what you deleted, so the rows have to go.

    Run under the **real** squash policy, because the tempting answer is that
    compaction already handles this. It half does and that is the trap: folding
    the history re-encodes it, and Yjs garbage-collects deleted content on the
    way out — but only once a document passes ``_SQUASH_UPDATES_ABOVE``, so the
    raw tail below that threshold always holds the retraction verbatim. A draft
    a player retracts a sentence from and then submits is exactly the case that
    never reaches a squash. Deleting the rows is the only complete answer, which
    is why the discard is a delete and never an archive.
    """
    secret = "MY NEIGHBOURS REAL NAME"
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            body = doc.get(ROOM_BODY_KEY, type=Text)
            body.insert(0, secret)
            await _wait_for_body(
                rooms.room_doc(collab.id), f"{secret}{SEED_BODY}", "the room"
            )
            del body[0 : len(secret)]
            await _wait_for_body(rooms.room_doc(collab.id), SEED_BODY, "the retraction")

            # The premise, asserted rather than assumed: the retracted text is
            # still on disk — squashed — while the draft lives. Without this the
            # test would pass against a store that never held the secret at all.
            stored = await _stored_updates(rooms, collab.id)
            assert any(secret.encode() in update for update in stored), (
                "the tombstone premise failed: no retained update holds the deleted "
                "text, so this test would pass without discarding anything"
            )

            await submit_praxis(collab.id, character.id, db_session)
            await submit_praxis(collab.id, character2.id, db_session)

        assert await _stored_updates(rooms, collab.id) == []
        for update in await _every_stored_update(rooms):
            assert secret.encode() not in update
        assert await _record(rooms, collab.id) == ("Collab Praxis", SEED_BODY)
