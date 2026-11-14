"""The praxis room's ASGI app, driven by real ``pycrdt`` clients (#1740, ADR-0073).

In-memory ASGI on one side, pycrdt ``Channel`` on the other. Don't stub the
CRDT: the bug guarded is two clients each seeding and merging into two copies.
"""

import asyncio
import io
import linecache
from contextlib import asynccontextmanager, suppress
from typing import Any, AsyncIterator, Callable

import pytest
import pytest_asyncio
from pycrdt import (
    Awareness,
    Doc,
    Map,
    Provider,
    Text,
    YMessageType,
    create_awareness_message,
    read_message,
)
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

#: Ceiling on non-poll waits (connect, start/stop, unwind) so a hang names its
#: seam (#1930). Worst case 4 x 10s must stay under pytest-timeout's 60s.
_CEILING_SECONDS = 10.0


def _await_chain(task: asyncio.Task) -> str:
    """Walks ``cr_await``: ``Task.get_stack`` stops at the outermost frame."""
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
    """pytest-timeout dumps threads, and all tasks share one (#1930)."""
    buffer = io.StringIO()
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
    try:
        async with asyncio.timeout(_CEILING_SECONDS):
            yield
    except TimeoutError:
        raise AssertionError(
            f"timed out after {_CEILING_SECONDS}s waiting for "
            f"{description}{_pending_task_dump()}"
        ) from None


#: Read off the live app so the test follows the mount if it moves.
ROOM_MOUNT = next(
    route for route in fastapi_app.routes if getattr(route, "name", None) == "praxis-rooms"
)


def mounted_room_path(praxis_id: int) -> str:
    return f"{ROOM_MOUNT.path}/praxis/{praxis_id}"


class _Socket:
    """Both ends of one WebSocket: ASGI for the app, ``Channel`` for the client."""

    def __init__(self, path: str) -> None:
        self.path = path
        self.accepted = asyncio.Event()
        self.closed = asyncio.Event()
        self.close_code: int | None = None
        self._to_app: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._to_client: asyncio.Queue[bytes | None] = asyncio.Queue()

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
        await self._to_app.put({"type": "websocket.disconnect", "code": 1000})
        await self._to_client.put(None)

    async def connect(self) -> None:
        await self._to_app.put({"type": "websocket.connect"})


class _ChannelAdapter:

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
    """The test's one session, locked: room tasks would otherwise use it
    concurrently with the test body."""

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
    def __init__(
        self, server: PraxisRoomServer, sessions: _SharedSessionFactory
    ) -> None:
        self.server = server
        self.app = PraxisRoomASGIServer(server)
        #: DB reads while rooms run MUST go through this, not ``db_session``,
        #: or a room task raises "concurrent operations are not permitted".
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
        """Returns once accepted or refused. ``through`` (the FastAPI app, to
        cross the mount) needs ``path`` too: :func:`mounted_room_path`."""
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
            # Empty at the outermost app; each mount grows it.
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
        """Harness-only: holds the session lock, since a submit races room tasks
        on the one shared session (production uses separate sessions)."""
        async with self.sessions() as session:
            return await submit_praxis(praxis_id, character_id, session)

    def room_doc(self, praxis_id: int) -> Doc | None:
        room = self.server.rooms.get(room_name_for(praxis_id))
        return None if room is None else room.ydoc

    async def aclose(self) -> None:
        """Disconnect ends the tasks; cancel is only the backstop (#1930).

        A raw ``Task.cancel`` inside anyio's task group occasionally wedged the
        task. ``asyncio.wait`` because ``release``'s shielded scope ignores a
        cancel of this task.
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
            # Retrieve, or it surfaces as unretrieved on a later test.
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
    """Patches the module singleton, which ``services.praxis`` reads per call."""
    sessions = _SharedSessionFactory(db_session)
    server = PraxisRoomServer(
        session_factory=sessions,
        squash_updates_above=squash_updates_above,
        flush_debounce_seconds=flush_debounce_seconds,
    )
    monkeypatch.setattr(praxis_room, "PRAXIS_ROOM_SERVER", server)
    # The mounted app holds its own server reference.
    monkeypatch.setattr(praxis_room.PRAXIS_ROOM_APP, "rooms", server)
    rooms = _Rooms(server, sessions)
    # By hand so ceilings bound start/stop only, not the test body.
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
    """A real pycrdt client. Never seeds: all content comes from the server."""
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


@pytest_asyncio.fixture
async def collab(
    db_session: AsyncSession,
    active_task: Task,
    character: Character,
    character2: Character,
) -> Praxis:
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
    """Per-client seeding would merge into ``SEED_BODY * 2`` on both clients."""
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
    """Needs the lock around check-then-seed."""
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


# Each case: what the handshake presents. ``CORSMiddleware`` skips WebSockets, so
# the origin check is the only CSWSH guard.
_REFUSED_HANDSHAKES = {
    "non_member": lambda collab, account, other: (collab.id, other.id, {}),
    "no_cookie": lambda collab, account, other: (collab.id, None, {}),
    "foreign_origin": lambda collab, account, other: (
        collab.id, account.id, {"origin": "https://evil.example"}
    ),
    "missing_origin": lambda collab, account, other: (
        collab.id, account.id, {"origin": None}
    ),
    "unreadable_token": lambda collab, account, other: (
        collab.id, None, {"raw_token": "not-a-jwt"}
    ),
    "unknown_praxis": lambda collab, account, other: (
        collab.id + 10_000, account.id, {}
    ),
    "unknown_path": lambda collab, account, other: (
        collab.id, account.id, {"path": "/praxis/not-a-number"}
    ),
}
_ALSO_REFUSED_THROUGH_THE_MOUNT = ("non_member", "foreign_origin", "missing_origin")


@pytest.mark.parametrize(
    "case, through_mount",
    [(case, False) for case in _REFUSED_HANDSHAKES]
    + [(case, True) for case in _ALSO_REFUSED_THROUGH_THE_MOUNT],
)
async def test_a_bad_handshake_is_refused(
    db_session, collab, account, account3, character3, monkeypatch, case, through_mount
) -> None:
    assert settings.ROOM_ALLOW_MISSING_ORIGIN is False
    praxis_id, account_id, extra = _REFUSED_HANDSHAKES[case](collab, account, account3)
    if through_mount:
        extra = {
            **extra,
            "path": mounted_room_path(praxis_id),
            "through": fastapi_app,
        }
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(praxis_id, account_id, **extra)
        assert socket.closed.is_set()
        assert not socket.accepted.is_set()


async def test_missing_origin_is_allowed_when_configured(
    db_session, collab, account, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "ROOM_ALLOW_MISSING_ORIGIN", True)
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account.id, origin=None)
        assert socket.accepted.is_set()


# Through ``main.app``: Starlette's ``Mount`` sets ``root_path`` but leaves
# ``path`` whole, so the room app sees ``/rooms/praxis/12``.


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
        # Accepted is not served: the document must arrive too.
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "a client behind the mount")


async def test_kicked_member_socket_is_closed(
    db_session, collab, account, account2, character, character2, monkeypatch
) -> None:
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
    async with running_rooms(db_session, monkeypatch) as rooms:
        leaver = await rooms.open(collab.id, account2.id)
        async with client_doc(leaver) as doc:
            await _wait_for_body(doc, SEED_BODY, "the member about to leave")

            await leave_praxis(collab.id, character2.id, db_session)

            await _wait_for(leaver.closed.is_set, "the leaver's socket to close")
            assert leaver.close_code == 1008


async def test_a_second_instance_refuses_to_start(test_engine) -> None:
    """Rooms are in-process; a process can't see its replica count (ADR-0073)."""
    held = await acquire_single_instance_lock(test_engine)
    try:
        with pytest.raises(RuntimeError, match="single-instance"):
            await acquire_single_instance_lock(test_engine, wait_seconds=0)
    finally:
        await held.close()

    reacquired = await acquire_single_instance_lock(test_engine)
    await reacquired.close()


async def test_the_lock_waits_out_a_departing_predecessor(
    test_engine, monkeypatch
) -> None:
    monkeypatch.setattr(praxis_room, "_LOCK_RETRY_SECONDS", 0.05)
    predecessor = await acquire_single_instance_lock(test_engine)

    async def let_go() -> None:
        await asyncio.sleep(0.1)
        await predecessor.close()

    release = asyncio.create_task(let_go())
    successor = await acquire_single_instance_lock(test_engine, wait_seconds=5)
    await release
    await successor.close()


async def test_store_squashes_its_history_losslessly(db_session, collab) -> None:
    """Straight at the store: rows via a socket would be a timing test."""
    store = praxis_room.PostgresYStore(
        room_name_for(collab.id),
        session_factory=_SharedSessionFactory(db_session),
        squash_updates_above=2,
    )
    doc = Doc()
    # Observe from before the seed, as a room does.
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


# The flush: the room is the only writer of a body (#1743).


async def _record(rooms: _Rooms, praxis_id: int) -> tuple[str | None, str | None]:
    """Past any identity map."""
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
    """Any member may edit (ADR-0013); ``account2`` is not the creator."""
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
    """Byte for byte (ADR-0073): every markdown reader reads this column."""
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
    """Both insertions must survive in the column, not just a change."""
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
    """The title is a last-write-wins map key."""
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
    """Absent means "no remote value yet", not empty: nothing seeds it."""
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
    """The 30s debounce means only the closing flush can satisfy this."""
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


# The proposal: an edit cancels it, and nothing is ever refused (ADR-0079).


async def _stored_updates(rooms: _Rooms, praxis_id: int) -> list[bytes]:
    async with rooms.sessions() as session:
        rows = await session.execute(
            select(PraxisRoomUpdate.update)
            .where(PraxisRoomUpdate.praxis_id == praxis_id)
            .order_by(PraxisRoomUpdate.id)
        )
        return list(rows.scalars().all())


async def _every_stored_update(rooms: _Rooms) -> list[bytes]:
    async with rooms.sessions() as session:
        rows = await session.execute(select(PraxisRoomUpdate.update))
        return list(rows.scalars().all())


async def _settle() -> None:
    for _ in range(25):
        await asyncio.sleep(0.01)


async def _proposal(rooms: _Rooms, praxis_id: int) -> tuple[PraxisStatus, Any]:
    """Column select: the identity map may hold a stale ``Praxis``."""
    async with rooms.sessions() as session:
        row = (
            await session.execute(
                select(Praxis.status, Praxis.submit_proposed_at).where(
                    Praxis.id == praxis_id
                )
            )
        ).one()
    return row[0], row[1]


async def _wait_for_drafting(rooms: _Rooms, praxis_id: int, description: str) -> None:
    loop = asyncio.get_running_loop()
    deadline = loop.time() + _TIMEOUT_SECONDS
    while True:
        status, proposed_at = await _proposal(rooms, praxis_id)
        if status == PraxisStatus.in_progress and proposed_at is None:
            return
        if loop.time() >= deadline:
            raise AssertionError(
                f"timed out waiting for {description}: the row holds "
                f"status={status} submit_proposed_at={proposed_at!r}"
            )
        await asyncio.sleep(0.02)


async def test_typing_while_a_proposal_is_live_cancels_it(
    db_session, collab, account2, character, monkeypatch
) -> None:
    """ADR-0079: a CRDT text change by the holdout cancels the proposal."""
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        holdout = await rooms.open(collab.id, account2.id)
        async with client_doc(holdout) as doc:
            await _wait_for_body(doc, SEED_BODY, "the holdout")

            # `character` proposes over REST, not connected.
            proposed = await rooms.submit(collab.id, character.id)
            assert proposed.status == PraxisStatus.pending
            assert proposed.submit_proposed_at is not None

            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "not yet ")
            await _wait_for_drafting(
                rooms, collab.id, "the edit to cancel the proposal"
            )
            # Nobody is hung up on for writing.
            assert not holdout.closed.is_set()

        await _wait_for_record(
            rooms, collab.id, "the cancelled proposal's text", body_text=f"not yet {SEED_BODY}"
        )
        async with rooms.sessions() as session:
            approvals = (
                await session.execute(
                    select(PraxisMember.has_submitted).where(
                        PraxisMember.praxis_id == collab.id
                    )
                )
            ).scalars().all()
        assert list(approvals) == [False, False]


async def test_an_awareness_update_never_cancels_a_proposal(
    db_session, collab, account2, character, monkeypatch
) -> None:
    """Pins the document observer: an inbound-message hook can't tell a caret
    from a keystroke."""
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=0.05) as rooms:
        socket = await rooms.open(collab.id, account2.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the holdout")
            await rooms.submit(collab.id, character.id)

            awareness = Awareness(Doc())
            awareness.set_local_state({"user": {"name": "Holdout"}, "cursor": 7})
            await socket.send_bytes(
                create_awareness_message(
                    awareness.encode_awareness_update([awareness.client_id])
                )
            )
            await _settle()

            status, proposed_at = await _proposal(rooms, collab.id)
            assert status == PraxisStatus.pending
            assert proposed_at is not None


async def _announce(socket: _Socket, state: dict[str, Any]) -> int:
    awareness = Awareness(Doc())
    awareness.set_local_state(state)
    update = awareness.encode_awareness_update([awareness.client_id])
    await socket.send_bytes(create_awareness_message(update))
    return awareness.client_id


async def _mirror_awareness(socket: _Socket, mirror: Awareness) -> None:
    async for frame in socket:
        if frame[0] == YMessageType.AWARENESS:
            mirror.apply_awareness_update(read_message(frame[1:]), "remote")


@pytest.mark.parametrize("how", ["drop", "kick"])
async def test_a_departing_socket_takes_its_awareness_with_it(
    how, db_session, collab, account, account2, character, character2, monkeypatch
) -> None:
    """A closed tab sends no awareness disconnect; the room clears it instead
    (#3211)."""
    async with running_rooms(db_session, monkeypatch) as rooms:
        stayer = await rooms.open(collab.id, account.id)
        leaver = await rooms.open(collab.id, account2.id)
        mirror = Awareness(Doc())
        peer = asyncio.create_task(_mirror_awareness(stayer, mirror))
        try:
            stayer_id = await _announce(stayer, {"user": {"name": "Stayer"}})
            leaver_id = await _announce(leaver, {"user": {"name": "Leaver"}})
            room = rooms.server.rooms[room_name_for(collab.id)]
            await _wait_for(
                lambda: {stayer_id, leaver_id} <= set(mirror.states),
                "the peer to see both members",
            )

            if how == "drop":
                await leaver.disconnect()
            else:
                await kick_member(collab.id, character2.id, character.id, db_session)
            await _wait_for(
                lambda: leaver_id not in mirror.states,
                "the peer to be told the leaver is gone",
            )

            assert leaver_id not in room.awareness.states
            assert stayer_id in room.awareness.states
            assert stayer_id in mirror.states
        finally:
            peer.cancel()
            with suppress(asyncio.CancelledError):
                await peer


async def test_withdrawing_a_proposal_has_the_same_effect_as_an_edit(
    db_session, collab, account2, character, character2, monkeypatch
) -> None:
    """ADR-0079; the withdrawer is deliberately not the proposer."""
    async with running_rooms(db_session, monkeypatch) as rooms:
        await submit_praxis(collab.id, character.id, db_session)
        reopened = await unsubmit_praxis(collab.id, character2.id, db_session)

        assert reopened.status == PraxisStatus.in_progress
        assert [member.has_submitted for member in reopened.members] == [False, False]
        assert reopened.submit_proposed_at is None

        socket = await rooms.open(collab.id, account2.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the reopening client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "withdrawn ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"withdrawn {SEED_BODY}", "the room"
            )


async def test_publishing_discards_the_document_and_keeps_the_body(
    db_session, collab, account, character, character2, monkeypatch
) -> None:
    """30s debounce: only the publish-time flatten can write the body."""
    async with running_rooms(db_session, monkeypatch, flush_debounce_seconds=30.0) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "final ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"final {SEED_BODY}", "the room"
            )
            assert await _stored_updates(rooms, collab.id) != []

            await rooms.submit(collab.id, character.id)          # Propose
            published = await rooms.submit(collab.id, character2.id)  # Approve → Live

        assert published.status == PraxisStatus.submitted
        assert await _stored_updates(rooms, collab.id) == []
        assert await _record(rooms, collab.id) == ("Collab Praxis", f"final {SEED_BODY}")


async def test_a_solo_seal_flattens_the_live_room_into_the_record(
    db_session, active_task, character, account, monkeypatch
) -> None:
    """Solo seals with no proposal and ``abandon()`` cancels the closing flush.
    Covers duels too (ADR-0011)."""
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
    """A surviving document merged with a fresh seed would double (#1740)."""
    async with running_rooms(db_session, monkeypatch) as rooms:
        socket = await rooms.open(collab.id, account.id)
        async with client_doc(socket) as doc:
            await _wait_for_body(doc, SEED_BODY, "the first client")
            doc.get(ROOM_BODY_KEY, type=Text).insert(0, "published ")
            await _wait_for_body(
                rooms.room_doc(collab.id), f"published {SEED_BODY}", "the room"
            )
            await rooms.submit(collab.id, character.id)     # Propose
            await rooms.submit(collab.id, character2.id)    # Approve → Live

        await unsubmit_praxis(collab.id, character2.id, db_session)

        rejoined = await rooms.open(collab.id, account2.id)
        async with client_doc(rejoined) as doc:
            await _wait_for_body(doc, f"published {SEED_BODY}", "the rejoining client")
            assert _body(rooms.room_doc(collab.id)) == f"published {SEED_BODY}"


async def test_text_a_member_deleted_does_not_outlive_the_draft(
    db_session, collab, account, character, character2, monkeypatch
) -> None:
    """Privacy: a CRDT keeps deleted text, so the discard deletes the rows.

    Real squash policy: squashing GCs deletions only past
    ``_SQUASH_UPDATES_ABOVE``; the raw tail below keeps them verbatim.
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

            # Premise: the secret is on disk while the draft lives.
            stored = await _stored_updates(rooms, collab.id)
            assert any(secret.encode() in update for update in stored), (
                "the tombstone premise failed: no retained update holds the deleted "
                "text, so this test would pass without discarding anything"
            )

            await rooms.submit(collab.id, character.id)     # Propose
            await rooms.submit(collab.id, character2.id)    # Approve → Live

        assert await _stored_updates(rooms, collab.id) == []
        for update in await _every_stored_update(rooms):
            assert secret.encode() not in update
        assert await _record(rooms, collab.id) == ("Collab Praxis", SEED_BODY)
