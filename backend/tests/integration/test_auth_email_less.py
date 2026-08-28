"""Integration tests for the email-less sign-in lanes (ADR-0088).

Covers ``/auth/key/*`` end to end (real Ed25519 signatures against the ASGI
app, organ untouched) and ``/auth/atproto*`` with the organ client stubbed at
the router's bound names (the organ has its own lanes and custody proofs; these
tests pin World Zero's half — minting, resolution, pausing, error passage).
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

import routers.auth as auth_router
from errors import ErrorCode, coded_error, raise_coded
from models.account import Account, AuthProvider
from services.account_deletion import delete_account


def _new_key():
    private = Ed25519PrivateKey.generate()
    public_b64 = base64.b64encode(
        private.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
    ).decode()
    return private, public_b64


def _sign(private, message: str) -> str:
    return base64.b64encode(private.sign(message.encode("utf-8"))).decode()


async def _key_sign_in(client: AsyncClient, private, public_b64: str):
    """A whole key lane round trip: challenge, sign, verify."""
    resp = await client.post("/auth/key/challenge", json={"public_key": public_b64})
    assert resp.status_code == 200
    signature = _sign(private, resp.json()["message"])
    return await client.post(
        "/auth/key/verify", json={"public_key": public_b64, "signature": signature}
    )


# --- the key lane (organ stubbed at the router's bound names) -------------------
#
# The organ owns the challenge book and the signature verdict — these tests pin
# World Zero's half (minting, resolution, pausing, coded error passage). The
# organ's own lanes prove custody, one-shot law, and expiries on its side.

_ORG_MESSAGE = "World Zero key login v1\nnonce: fixednonce62235nbl24gh\n"


def _stub_organ(monkeypatch, verify_exc=None):
    """Stub the two organ calls at the router's bound names.

    ``verify_exc=None`` fakes a yes; otherwise the stub raises it, the way a
    coded refusal travels through services/atproto_identity at runtime.
    """

    async def fake_challenge(public_key: str):
        return {"message": _ORG_MESSAGE, "expires_in": 60}

    async def fake_verify(public_key: str, signature: str):
        if verify_exc is not None:
            raise verify_exc
        return None

    monkeypatch.setattr(auth_router, "atp_key_challenge", fake_challenge)
    monkeypatch.setattr(auth_router, "atp_key_verify", fake_verify)


async def test_key_lane_mints_and_resolves(client: AsyncClient, monkeypatch):
    _stub_organ(monkeypatch)
    private, public_b64 = _new_key()
    resp = await _key_sign_in(client, private, public_b64)
    assert resp.status_code == 200
    assert "access_token" in resp.headers["set-cookie"]

    me = await client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["provider"] == AuthProvider.KEY
    assert me.json()["email"] == ""  # email-less: NULL on the row, "" on the wire
    account_id = me.json()["account_id"]

    again = await _key_sign_in(client, private, public_b64)
    assert again.status_code == 200
    me2 = await client.get("/auth/me")
    assert me2.json()["account_id"] == account_id  # same key, same account


async def test_key_challenge_carries_the_organ_message(
    client: AsyncClient, monkeypatch
):
    _stub_organ(monkeypatch)
    _, public_b64 = _new_key()
    resp = await client.post("/auth/key/challenge", json={"public_key": public_b64})
    assert resp.status_code == 200
    assert resp.json()["message"] == _ORG_MESSAGE  # verbatim: no reassembly here
    assert resp.json()["expires_in"] == 60


async def test_key_challenge_rejects_a_bad_key(client: AsyncClient):
    # local refusal: never reaches the organ (unstubbed on purpose)
    resp = await client.post("/auth/key/challenge", json={"public_key": "nope***"})
    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == ErrorCode.key_invalid


async def test_key_verify_bad_shape_is_a_local_refusal(
    client: AsyncClient, monkeypatch
):
    _stub_organ(monkeypatch)
    _, public_b64 = _new_key()
    verify = await client.post(
        "/auth/key/verify", json={"public_key": public_b64, "signature": "AAAA"}
    )
    assert verify.status_code == 403
    assert verify.json()["detail"]["code"] == ErrorCode.key_bad_signature


async def test_key_verify_bad_signature_passes_the_organ_code(
    client: AsyncClient, monkeypatch
):
    private, public_b64 = _new_key()
    _stub_organ(
        monkeypatch,
        verify_exc=coded_error(403, ErrorCode.key_bad_signature, "no."),
    )
    resp = await _key_sign_in(client, private, public_b64)
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == ErrorCode.key_bad_signature


async def test_key_verify_without_challenge(client: AsyncClient, monkeypatch):
    private, public_b64 = _new_key()
    _stub_organ(
        monkeypatch,
        verify_exc=coded_error(404, ErrorCode.key_challenge_missing, "none parked."),
    )
    verify = await client.post(
        "/auth/key/verify",
        json={"public_key": public_b64, "signature": _sign(private, _ORG_MESSAGE)},
    )
    assert verify.status_code == 404
    assert verify.json()["detail"]["code"] == ErrorCode.key_challenge_missing


async def test_key_challenge_expired(client: AsyncClient, monkeypatch):
    private, public_b64 = _new_key()
    _stub_organ(
        monkeypatch,
        verify_exc=coded_error(410, ErrorCode.key_challenge_expired, "gone."),
    )
    resp = await _key_sign_in(client, private, public_b64)
    assert resp.status_code == 410
    assert resp.json()["detail"]["code"] == ErrorCode.key_challenge_expired


async def test_key_register_and_key_sign_in_as_that_account(
    client: AsyncClient, account: Account, db_session: AsyncSession, monkeypatch
):
    """Attach a key, then arrive as it: the two births of an (account, key) pair."""
    _stub_organ(monkeypatch)
    private, public_b64 = _new_key()
    from services.auth import create_jwt

    headers = {"Authorization": f"Bearer {create_jwt(account.id)}"}
    reg = await client.post(
        "/auth/key/challenge", json={"public_key": public_b64}, headers=headers
    )
    assert reg.status_code == 200
    reg = await client.post(
        "/auth/key/register",
        json={
            "public_key": public_b64,
            "signature": _sign(private, reg.json()["message"]),
        },
        headers=headers,
    )
    assert reg.status_code == 200

    # idempotent for the same account (a fresh proof each time)
    resp = await client.post("/auth/key/challenge", json={"public_key": public_b64})
    again = await client.post(
        "/auth/key/register",
        json={
            "public_key": public_b64,
            "signature": _sign(private, resp.json()["message"]),
        },
        headers=headers,
    )
    assert again.status_code == 200

    sign_in = await _key_sign_in(client, private, public_b64)
    assert sign_in.status_code == 200
    me = await client.get("/auth/me")
    assert me.json()["account_id"] == account.id


async def test_key_register_without_possession_is_refused(
    client: AsyncClient, account: Account, monkeypatch
):
    """A signature that fails means no link — the capture hole stays closed."""
    private, public_b64 = _new_key()
    _stub_organ(
        monkeypatch,
        verify_exc=coded_error(403, ErrorCode.key_bad_signature, "no."),
    )
    from services.auth import create_jwt

    headers = {"Authorization": f"Bearer {create_jwt(account.id)}"}
    reg = await client.post(
        "/auth/key/register",
        json={
            "public_key": public_b64,
            "signature": _sign(private, "World Zero key login v1\nnonce: x\n"),
        },
        headers=headers,
    )
    assert reg.status_code == 403
    assert reg.json()["detail"]["code"] == ErrorCode.key_bad_signature


async def test_key_register_conflict_across_accounts(
    client: AsyncClient, account: Account, account2: Account, monkeypatch
):
    _stub_organ(monkeypatch)
    private, public_b64 = _new_key()
    from services.auth import create_jwt

    headers1 = {"Authorization": f"Bearer {create_jwt(account.id)}"}
    headers2 = {"Authorization": f"Bearer {create_jwt(account2.id)}"}
    resp = await client.post("/auth/key/challenge", json={"public_key": public_b64})
    first = await client.post(
        "/auth/key/register",
        json={
            "public_key": public_b64,
            "signature": _sign(private, resp.json()["message"]),
        },
        headers=headers1,
    )
    assert first.status_code == 200
    resp = await client.post("/auth/key/challenge", json={"public_key": public_b64})
    conflict = await client.post(
        "/auth/key/register",
        json={
            "public_key": public_b64,
            "signature": _sign(private, resp.json()["message"]),
        },
        headers=headers2,
    )
    assert conflict.status_code == 409
    assert conflict.json()["detail"]["code"] == ErrorCode.key_already_linked


# --- the atproto lanes (organ stubbed at the router's bound names) ------------

async def test_atproto_session_mints_and_resolves(client: AsyncClient, monkeypatch):
    async def fake_login(identifier: str, password: str):
        return ("did:plc:testalice", "alice.bsky.social")

    monkeypatch.setattr(auth_router, "atp_session_login", fake_login)
    resp = await client.post(
        "/auth/atproto", json={"identifier": "alice.bsky.social", "password": "pw"}
    )
    assert resp.status_code == 200
    me = await client.get("/auth/me")
    assert me.json()["provider"] == AuthProvider.ATPROTO
    assert me.json()["email"] == ""
    account_id = me.json()["account_id"]

    # second sign-in by the same DID resolves the same account, even via a
    # renamed handle — the DID is the identity, the handle was only the road
    async def fake_login2(identifier: str, password: str):
        return ("did:plc:testalice", "alice-new.bsky.social")

    monkeypatch.setattr(auth_router, "atp_session_login", fake_login2)
    resp = await client.post(
        "/auth/atproto", json={"identifier": "alice-new.bsky.social", "password": "pw"}
    )
    assert resp.status_code == 200
    me2 = await client.get("/auth/me")
    assert me2.json()["account_id"] == account_id


async def test_atproto_session_bad_credentials_pass_through(
    client: AsyncClient, monkeypatch
):
    async def fake_login(identifier: str, password: str):
        raise_coded(401, ErrorCode.atproto_bad_credentials, "nope.")

    monkeypatch.setattr(auth_router, "atp_session_login", fake_login)
    resp = await client.post(
        "/auth/atproto", json={"identifier": "alice.bsky.social", "password": "wrong"}
    )
    assert resp.status_code == 401
    assert resp.json()["detail"]["code"] == ErrorCode.atproto_bad_credentials


async def test_atproto_challenge_round_trip(client: AsyncClient, monkeypatch):
    async def fake_start(handle: str):
        return {
            "did": "did:plc:testbob",
            "pds": "https://pds.example",
            "token": "tok123",
            "expires_in": 300,
        }

    monkeypatch.setattr(auth_router, "atp_challenge_start", fake_start)
    start = await client.post(
        "/auth/atproto/challenge", json={"handle": "bob.bsky.social"}
    )
    assert start.status_code == 200
    assert start.json()["token"] == "tok123"
    assert start.json()["did"] == "did:plc:testbob"
    assert "pds" not in start.json()  # the organ's answer is trimmed at the wire

    async def fake_verify(handle: str, token: str):
        return ("did:plc:testbob", "at://did:plc:testbob/app.bsky.feed.post/x")

    monkeypatch.setattr(auth_router, "atp_challenge_verify", fake_verify)
    verify = await client.post(
        "/auth/atproto/challenge/verify",
        json={"handle": "bob.bsky.social", "token": "tok123"}
    )
    assert verify.status_code == 200
    me = await client.get("/auth/me")
    assert me.json()["provider"] == AuthProvider.ATPROTO


async def test_atproto_challenge_pending_is_a_404(client: AsyncClient, monkeypatch):
    async def fake_verify(handle: str, token: str):
        raise_coded(404, ErrorCode.atproto_challenge_pending, "not yet.")

    monkeypatch.setattr(auth_router, "atp_challenge_verify", fake_verify)
    resp = await client.post(
        "/auth/atproto/challenge/verify",
        json={"handle": "bob.bsky.social", "token": "t"},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == ErrorCode.atproto_challenge_pending


# --- the paused sign-in, over XHR (the 409 courier) ---------------------------

async def test_paused_key_sign_in_answers_409_and_the_gate_consumes_it(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch,
):
    _stub_organ(monkeypatch)
    private, public_b64 = _new_key()
    assert (await _key_sign_in(client, private, public_b64)).status_code == 200
    me = await client.get("/auth/me")
    account_id = me.json()["account_id"]

    await delete_account(account_id, db_session)

    client.cookies.clear()
    paused = await _key_sign_in(client, private, public_b64)
    assert paused.status_code == 409
    assert (
        paused.json()["detail"]["code"] == ErrorCode.returning_player_consent_required
    )

    # the parked session drives the same gate the OAuth redirect drives
    gate = await client.get("/auth/returning-player")
    assert gate.status_code == 200
    confirm = await client.post("/auth/returning-player")
    assert confirm.status_code == 200
    me2 = await client.get("/auth/me")
    assert me2.json()["account_id"] != account_id  # fresh start, no undo (ADR-0081)
