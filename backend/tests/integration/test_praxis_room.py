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
from pycrdt import Doc, Provider, Text
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

import services.praxis_room as praxis_room
from config import settings
from models.character import Character
from models.praxis import Praxis, PraxisMember, PraxisStatus, PraxisType
from models.praxis_room import PraxisRoomUpdate
from models.task import Task
from services.auth import create_jwt
from services.praxis import kick_member, leave_praxis
from services.praxis_room import (
    ROOM_BODY_KEY,
    PraxisRoomASGIServer,
    PraxisRoomServer,
    acquire_single_instance_lock,
    room_name_for,
)

SEED_BODY = "The seeded body of one praxis."
ALLOWED_ORIGIN = settings.cors_origins[0]
_TIMEOUT_SECONDS = 5.0


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

    def __init__(self, server: PraxisRoomServer) -> None:
        self.server = server
        self.app = PraxisRoomASGIServer(server)
        self._tasks: list[asyncio.Task] = []

    async def open(
        self,
        praxis_id: int,
        account_id: int | None,
        *,
        origin: str | None = ALLOWED_ORIGIN,
        path: str | None = None,
        raw_token: str | None = None,
    ) -> _Socket:
        """Start a handshake. Returns once the app has accepted or refused it."""
        socket = _Socket(path or f"/praxis/{praxis_id}")
        headers: list[tuple[bytes, bytes]] = [(b"host", b"api.worldzero.test")]
        if origin is not None:
            headers.append((b"origin", origin.encode()))
        token = raw_token or (None if account_id is None else create_jwt(account_id))
        if token is not None:
            headers.append((b"cookie", f"access_token={token}".encode()))
        scope = {"type": "websocket", "path": socket.path, "headers": headers}

        self._tasks.append(
            asyncio.create_task(self.app(scope, socket.receive, socket.send))
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
) -> AsyncIterator[_Rooms]:
    """A room server for one test, standing in for the module singleton.

    ``services.praxis`` reaches the running server through the module global on
    every call, so patching it here is what puts the kick/leave revoke door
    under test rather than a copy of it.
    """
    server = PraxisRoomServer(
        session_factory=_SharedSessionFactory(db_session),
        squash_updates_above=squash_updates_above,
    )
    monkeypatch.setattr(praxis_room, "PRAXIS_ROOM_SERVER", server)
    rooms = _Rooms(server)
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
