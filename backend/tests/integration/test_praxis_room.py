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
import io
import linecache
from contextlib import asynccontextmanager, suppress
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

#: The ceiling on the waits here that are not a poll — a client connecting or
#: disconnecting, the room server starting or stopping, a cancelled socket task
#: unwinding (#1930).
#:
#: Every one of them was unbounded, and a hang in any of them surfaced as
#: ``pytest-timeout`` firing at 60s with a stack ending in
#: ``EpollSelector.select`` — the event loop asleep, which names neither end of
#: the socket. Both observed hangs left every polled wait uncovered, so they were
#: in one of these.
#:
#: It has to stay well under pytest-timeout's 60s so the seam is named before the
#: backstop fires. Worst case is one trip plus the ceilings the unwinding then
#: passes through: two nested clients, ``aclose`` and the server stopping — 4 x
#: 10s, which still leaves headroom.
_CEILING_SECONDS = 10.0


def _await_chain(task: asyncio.Task) -> str:
    """Where ``task`` is suspended, outermost coroutine first.

    ``Task.get_stack`` is not enough: a suspended coroutine's frame has no
    ``f_back``, so it prints the *one* outermost line and stops — which for a
    socket task is ``await self.rooms.serve(...)`` and nothing about why. Walking
    ``cr_await`` instead gives the whole chain down to the await that is stuck.
    """
    lines: list[str] = []
    awaited: Any = task.get_coro()
    seen: set[int] = set()
    while awaited is not None and id(awaited) not in seen:
        seen.add(id(awaited))
        frame = getattr(awaited, "cr_frame", None) or getattr(awaited, "gi_frame", None)
        if frame is not None:
            source = linecache.getline(frame.f_code.co_filename, frame.f_lineno).strip()
            lines.append(
                f'  File "{frame.f_code.co_filename}", line {frame.f_lineno},'
                f" in {frame.f_code.co_name}\n    {source}"
            )
        awaited = getattr(awaited, "cr_await", None) or getattr(
            awaited, "gi_yieldfrom", None
        )
    return "\n".join(lines) or "  <no frames>"


def _pending_task_dump() -> str:
    """Every unfinished task on this loop, and where it is waiting.

    A socket has two ends, and a hang needs both of them to diagnose.
    ``pytest-timeout`` dumps *threads*, and every task in this suite shares one
    thread, so its report shows the loop asleep and nothing else — which is
    exactly what #1930 arrived as. This is the other half.
    """
    buffer = io.StringIO()
    # Everything except the caller: this task's own stack is the one the failure
    # is already raised from, and under pytest it is mostly plugin frames.
    running = asyncio.current_task()
    tasks = sorted(
        (task for task in asyncio.all_tasks() if task is not running),
        key=lambda task: task.get_name(),
    )
    buffer.write(f"\n\n--- {len(tasks)} other pending task(s) on this event loop ---")
    for task in tasks:
        state = "cancelling" if task.cancelling() else "pending"
        buffer.write(f"\n\n== {task.get_name()} [{state}]\n")
        try:
            buffer.write(_await_chain(task))
        except Exception as exc:  # pragma: no cover — diagnostics must not raise
            buffer.write(f"  <could not read stack: {exc!r}>")
    return buffer.getvalue()


@asynccontextmanager
async def _bounded(description: str) -> AsyncIterator[None]:
    """Give an otherwise unbounded wait a ceiling and a name (#1930)."""
    try:
        async with asyncio.timeout(_CEILING_SECONDS):
            yield
    except TimeoutError:
        raise AssertionError(
            f"timed out after {_CEILING_SECONDS}s waiting for "
            f"{description}{_pending_task_dump()}"
        ) from None


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
        self._sockets: list[_Socket] = []

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

        self._sockets.append(socket)
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

    async def submit(self, praxis_id: int, character_id: int) -> Any:
        """``submit_praxis``, holding the lock the room's own tasks queue behind.

        A harness affordance, not a rule. Since #1808 a submit that seals an
        **open** room closes its sockets, so the room tears down inside this
        call and its closing flush writes the praxis. That flush runs on its own
        session in production; here one SAVEPOINT-backed session serves both
        sides, and two tasks using it at once raises "this session is in
        'prepared' state" out of a room task — where it reads as a room bug
        rather than as the harness bug it is.

        Callers must let the teardown finish (wait for the room to be dropped)
        before taking this lock again: ``release`` holds ``_open_lock`` while it
        waits for the session, and ``discard_document`` wants ``_open_lock``.
        """
        async with self.sessions() as session:
            return await submit_praxis(praxis_id, character_id, session)

    def room_doc(self, praxis_id: int) -> Doc | None:
        room = self.server.rooms.get(room_name_for(praxis_id))
        return None if room is None else room.ydoc

    async def aclose(self) -> None:
        """Hang every socket up, then cancel whatever is left (#1930).

        **The disconnect is what ends these tasks; the cancel is the backstop.**
        This used to cancel outright. Roughly once in 400 cycles a raw
        ``Task.cancel`` on a socket task suspended in the task group inside
        :meth:`_RoomConnection._receive` left it wedged: the task counted the
        cancellation (``cancelling() == 1``) and stayed asleep in anyio's
        ``TaskGroup.__aexit__``, while that group's cancel scope still read
        ``cancel_called is False`` — so neither half of the revoke race was ever
        told to stop, and the loop went idle with the room still open. That is
        #1930, whose CI signature is a 60s pytest-timeout ending in
        ``EpollSelector.select``.

        Hanging up avoids the question. It is also what a real client does:
        ``websocket.disconnect`` unwinds the serve loop through the door the room
        already has, with no cancellation involved on the happy path.

        ``asyncio.wait`` rather than ``await task`` for the ceiling:
        :meth:`PraxisRoomServer.release` runs its half of the teardown inside
        ``anyio.CancelScope(shield=True)``, and that shield holds against a plain
        ``Task.cancel`` — so a ceiling that works by cancelling *this* task would
        not reach a socket stuck in there. Giving up on the wait does.
        """
        if not self._tasks:
            return
        for socket in self._sockets:
            await socket.disconnect()
        _, pending = await asyncio.wait(self._tasks, timeout=_CEILING_SECONDS)
        for task in pending:
            task.cancel()
        if pending:
            _, pending = await asyncio.wait(pending, timeout=_CEILING_SECONDS)
        for task in self._tasks:
            # Read the outcome so a cancelled or failed socket task is not
            # reported as an unretrieved exception on some later, unrelated test.
            if task.done():
                with suppress(asyncio.CancelledError, Exception):
                    task.result()
        if pending:
            raise AssertionError(
                f"{len(pending)} praxis-room socket task(s) were still running "
                f"{_CEILING_SECONDS}s after being hung up on and cancelled."
                f"{_pending_task_dump()}"
            )


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
    # ``__aenter__``/``__aexit__`` by hand rather than ``async with server``:
    # the ceilings belong on the two ends, not around the test body. The body's
    # own waits are already bounded by :func:`_wait_for`, and a clock around it
    # would be a second timeout competing with pytest-timeout's.
    async with _bounded("the room server to start"):
        await server.__aenter__()
    try:
        yield rooms
    finally:
        await rooms.aclose()
        async with _bounded("the room server to stop"):
            await server.__aexit__(None, None, None)


@asynccontextmanager
async def client_doc(socket: _Socket) -> AsyncIterator[Doc]:
    """A real pycrdt client synchronizing over ``socket``.

    Note what it does *not* do: it never seeds. The document starts empty and
    everything in it arrives from the server.
    """
    doc = Doc()
    provider = Provider(doc, _ChannelAdapter(socket))
    async with _bounded(f"the client on {socket.path} to connect"):
        await provider.__aenter__()
    try:
        yield doc
    finally:
        async with _bounded(f"the client on {socket.path} to disconnect"):
            await provider.__aexit__(None, None, None)


async def _wait_for(predicate: Callable[[], bool], description: str) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + _TIMEOUT_SECONDS
    while loop.time() < deadline:
        if predicate():
            return
        await asyncio.sleep(0.01)
    raise AssertionError(
        f"timed out waiting for {description}{_pending_task_dump()}"
    )


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


async def _wait_for_the_freeze_to_settle(rooms: _Rooms, praxis_id: int) -> None:
    """The freeze closed every socket (#1808), so the room tears down. Wait it out.

    The teardown includes the closing flush, which runs on the room's session
    factory — the test's own session, here. Touching the database before it
    finishes is two tasks on one session, and the second collab submit is a
    database call.
    """
    await _wait_for(
        lambda: rooms.room_doc(praxis_id) is None, "the sealed room to be dropped"
    )


async def test_the_freeze_closes_every_socket_that_was_in_the_room(
    db_session, collab, account, account2, character, monkeypatch
) -> None:
    """The freeze's second door (#1808) — and the data-loss bug it exists for.

    Reproduced on production: two members drafting, one submits, and **the other
    is never told**. ``documentFrozen`` is derived from the fetched praxis, so
    their browser goes on accepting keystrokes and rendering them while the
    server drops every one. The text is on screen, so the player believes it is
    saved. It is not, and it never can be — the update never reached the server,
    a CRDT never reverts, and it exists only in that tab's memory.

    So the assertion here is deliberately **not** "a frozen room rejects an
    update". It already did, and that is not the bug. It is that a client cannot
    be left believing an accepted keystroke was saved: the socket it was typing
    down is gone, which is what makes the composer re-read the status.

    The close code is checked against its constant *and* its number, because the
    number is a wire contract — ``roomReconnect.ts`` decides on it, and it must
    not be 1008: that one means "stop asking", and a member holding a sealed
    write-up still has to reconnect to read it.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        submitter = await rooms.open(collab.id, account.id)
        holdout = await rooms.open(collab.id, account2.id)
        async with (
            client_doc(submitter) as submitter_doc,
            client_doc(holdout) as holdout_doc,
        ):
            await _wait_for_body(submitter_doc, SEED_BODY, "the submitter")
            await _wait_for_body(holdout_doc, SEED_BODY, "the holdout")

            # `character` is `account`'s, so the first client is the submitter.
            await rooms.submit(collab.id, character.id)

            await _wait_for(holdout.closed.is_set, "the holdout's socket to close")
            # The submitter's too: the freeze binds every member equally.
            await _wait_for(submitter.closed.is_set, "the submitter's socket to close")

        assert holdout.close_code == praxis_room._WS_ROOM_FROZEN == 4001
        assert submitter.close_code == praxis_room._WS_ROOM_FROZEN
        assert praxis_room._WS_ROOM_FROZEN != praxis_room._WS_POLICY_VIOLATION


async def test_a_pending_praxis_refuses_every_member_s_edits(
    db_session, collab, account, account2, character, monkeypatch
) -> None:
    """The freeze is a server rule, and it binds the submitter too.

    The before/after inside one test is the point: the same member who lands a
    keystroke while the collab is drafting lands nothing once it is pending. A
    test asserting only the second half would pass against a dead transport.

    The refused write is attempted on a **reconnected** socket, because since
    #1808 the freeze closes the ones that were open. That close is a courtesy to
    the client and must not be mistaken for the rule: the server is still the
    enforcer, and this is what proves it — a member who comes back, syncs and
    types is refused by the room, not by their own editor. Their local document
    takes the text anyway, which is the last assertion here and the whole reason
    the close has to happen at all.
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
            await rooms.submit(collab.id, character.id)
            await _wait_for(second.closed.is_set, "the holdout's socket to close")

        frozen = f"drafting {SEED_BODY}"
        await _wait_for_the_freeze_to_settle(rooms, collab.id)

        rejoined = await rooms.open(collab.id, account2.id)
        async with client_doc(rejoined) as doc:
            await _wait_for_body(doc, frozen, "the holdout coming back to read")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "holdout ")
            await _settle()

            assert _body(rooms.room_doc(collab.id)) == frozen
            # And this is the loss, stated: their own document holds the text
            # and the room's does not. Nothing recovers it; the close is only
            # what stops them writing a paragraph into it.
            assert _body(doc) == f"holdout {frozen}"


async def test_opening_an_already_frozen_praxis_keeps_the_reader_s_socket(
    db_session, collab, account2, character, monkeypatch
) -> None:
    """A sealed write-up is still readable, and reading it is not a transition.

    Two rules in one, because getting either wrong produces the same symptom
    from opposite directions:

    - ``SYNC_STEP1`` passes the refusal hook on purpose, so the document
      arrives. Remove that exemption and the composer stares at an empty box.
    - ``_read_freeze`` sets the flag on **every** room that opens frozen, so
      "the flag went from unset to set" is true of every reader. Closing on that
      would hang up on the socket that just asked to see the praxis — and on its
      every retry, for as long as the tab is open.

    Nobody was connected when this praxis sealed, which is exactly the arrival
    the second half describes.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        await submit_praxis(collab.id, character.id, db_session)

        reader = await rooms.open(collab.id, account2.id)
        assert reader.accepted.is_set()
        async with client_doc(reader) as doc:
            await _wait_for_body(doc, SEED_BODY, "a reader of the sealed write-up")
            await _settle()
            assert not reader.closed.is_set()


async def test_a_re_freeze_does_not_hang_up_on_a_frozen_room(
    db_session, collab, account2, character, monkeypatch
) -> None:
    """Only the transition closes sockets (#1808), never the state.

    ``follow_praxis_status`` is derived from the status rather than from the
    move, and is documented as idempotent, so it is called on transitions that
    change nothing. A close on every call would knock every reader of a pending
    collab off once per call and, with the reconnect that follows, churn.
    """
    async with running_rooms(db_session, monkeypatch) as rooms:
        await submit_praxis(collab.id, character.id, db_session)
        reader = await rooms.open(collab.id, account2.id)
        async with client_doc(reader) as doc:
            await _wait_for_body(doc, SEED_BODY, "the reader")

            rooms.server.follow_status(collab.id, True)
            await _settle()

            assert not reader.closed.is_set()
            assert _body(doc) == SEED_BODY


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

    The debounce is set past the test's life, so no *timed* flush can carry the
    typed sentence into ``body_text``. It has to arrive by one of the two writes
    that are not on a timer, and after #1808 which one depends on the shape of
    the seal: the freeze closes the room, so the **closing** flush does it here,
    and the publish-time flatten does it whenever a room is still live at the
    seal (see the solo test below). A praxis that sealed with the room's last
    words missing is the visible half of this bug either way, which is what this
    asserts and why it does not care which write got there.
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

            await rooms.submit(collab.id, character.id)
        await _wait_for_the_freeze_to_settle(rooms, collab.id)
        published = await submit_praxis(collab.id, character2.id, db_session)

        assert published.status == PraxisStatus.submitted
        assert await _stored_updates(rooms, collab.id) == []
        assert await _record(rooms, collab.id) == ("Collab Praxis", f"final {SEED_BODY}")


async def test_a_solo_seal_flattens_the_live_room_into_the_record(
    db_session, active_task, character, account, monkeypatch
) -> None:
    """The publish-time flatten, isolated — the one seal with no freeze before it.

    A solo praxis has one member, so ``on_submit`` seals straight to Live: there
    is no pending step, so #1808's freeze never fires, so the room is still open
    when ``discard_document`` runs and its ``abandon()`` cancels the closing
    flush. The flatten inside the sealing transaction is then the *only* thing
    that can put the last sentence in ``body_text`` — which is why the debounce
    is set past the test's life, and why this case needs its own test now that
    the collab above reaches the same column by the other road.
    """
    solo = Praxis(
        task_id=active_task.id,
        created_by_id=character.id,
        type=PraxisType.solo,
        status=PraxisStatus.in_progress,
        title="Solo Praxis",
        body_text=SEED_BODY,
    )
    db_session.add(solo)
    await db_session.flush()
    db_session.add(PraxisMember(praxis_id=solo.id, character_id=character.id))
    await db_session.commit()

    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=30.0) as rooms:
        socket = await rooms.open(solo.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the solo author")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "last sentence ")
            await _wait_for_body(
                rooms.room_doc(solo.id), f"last sentence {SEED_BODY}", "the room"
            )

            published = await submit_praxis(solo.id, character.id, db_session)

        assert published.status == PraxisStatus.submitted
        assert await _stored_updates(rooms, solo.id) == []
        assert await _record(rooms, solo.id) == (
            "Solo Praxis",
            f"last sentence {SEED_BODY}",
        )


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
            await rooms.submit(collab.id, character.id)
        await _wait_for_the_freeze_to_settle(rooms, collab.id)
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

            await rooms.submit(collab.id, character.id)
        await _wait_for_the_freeze_to_settle(rooms, collab.id)
        await submit_praxis(collab.id, character2.id, db_session)

        assert await _stored_updates(rooms, collab.id) == []
        for update in await _every_stored_update(rooms):
            assert secret.encode() not in update
        assert await _record(rooms, collab.id) == ("Collab Praxis", SEED_BODY)
