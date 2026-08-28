"""The atp organ is World Zero's one AT Protocol speaker (ADR-0088).

The organ (a badb-ridden fundies daemon, sibling repo ``~/projects/atp``) owns
the whole protocol story: the handle → DID → PDS resolution ladder, the
``createSession`` exchange, and the zero-credential challenge scan. It also
owns *custody*: the player's app password passes through it and its answer
carries a DID and a handle — never a token. This module is one POST and the
failure vocabulary. World Zero learns identity from it and keeps its own
session law (the JWT cookie) after that, so no ATProto credential is ever
stored or forwarded here either (#1374's posture, extended to a second
protocol).

POST shapes the organ answers (``ATP_ORGAN_URL`` in settings):

    /atp/session           {identifier, password}  -> {did, handle}
    /atp/challenge         {handle}                -> {did, pds, token, expires_in}
    /atp/challenge/verify  {handle, token}         -> {did, proof}
    /atp/key/challenge     {realm, public_key}     -> {message, expires_in}
    /atp/key/verify        {public_key, signature} -> {}

The organ also owns the key lane's Ed25519: openssl runs one tier below it,
so one crypto library ever verifies a signature in the warren. Its puzzle
book (not a browser session row) makes every challenge one-shot, so a signed
message for one app can never mint a session anywhere else — the ``realm``
in the message text is how that law is written down.

Organ error codes (``ATP_*``) are an internal contract, not player-facing copy:
they map to this module's coded refusals, which are what the catalog owns.
"""
from __future__ import annotations

import httpx

from config import settings
from errors import ErrorCode, raise_coded

#: One leg of a sign-in may wait on DNS, a cold PDS and a feed scan in
#: sequence; a tighter ceiling miscounts honest latency as outage.
_TIMEOUT_S = 25.0

#: The key lane's realm: how the organ writes "this challenge is for World
#: Zero" into the very bytes that get signed, so the same signature cannot
#: mint anything anywhere else. The frontend renders nothing of it; the book
#: does.
KEY_REALM = "World Zero"


async def _organ_post(lane: str, payload: dict) -> httpx.Response:
    """The one call shape. Transport failure is a 502 the caller names."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_S) as client:
            return await client.post(f"{settings.ATP_ORGAN_URL}{lane}", json=payload)
    except httpx.HTTPError:
        raise_coded(
            502,
            ErrorCode.atproto_unavailable,
            "The identity organ is unreachable.",
        )


async def session_login(identifier: str, password: str) -> tuple[str, str]:
    """Prove an ATProto identity by app password. Returns ``(did, handle)``.

    The identifier may be a handle or a DID — the organ resolves either; the
    ``did`` it answers is authoritative either way (handles are mutable, DIDs
    are not — ``provider_user_id`` law).
    """
    response = await _organ_post(
        "/atp/session", {"identifier": identifier, "password": password}
    )
    if response.status_code == 200:
        body = response.json()
        return body["did"], body["handle"]
    if response.status_code == 429:
        raise_coded(
            429,
            ErrorCode.atproto_rate_limited,
            "The identity organ is rate-limited right now; try again later.",
        )
    if response.status_code in (400, 401):
        raise_coded(
            401,
            ErrorCode.atproto_bad_credentials,
            "That handle and app password did not check out.",
        )
    raise_coded(
        502,
        ErrorCode.atproto_unavailable,
        "The identity organ could not reach that account's home.",
    )


async def challenge_start(handle: str) -> dict:
    """Begin the zero-credential lane: a token to post from the account.

    The organ answers the DID it resolved and the token; the player posts the
    token on their own feed; :func:`challenge_verify` finds it there. Nothing
    secret changes hands — the proof is a public post.
    """
    response = await _organ_post("/atp/challenge", {"handle": handle})
    if response.status_code == 200:
        return response.json()
    raise_coded(
        404,
        ErrorCode.atproto_bad_credentials,
        "That handle did not resolve to an account.",
    )


async def challenge_verify(handle: str, token: str) -> tuple[str, str]:
    """Find a started challenge's token on the feed.

    Returns ``(did, proof)``.
    """
    response = await _organ_post(
        "/atp/challenge/verify", {"handle": handle, "token": token}
    )
    if response.status_code == 200:
        body = response.json()
        return body["did"], body["proof"]
    if response.status_code == 404:
        raise_coded(
            404,
            ErrorCode.atproto_challenge_pending,
            "No post carrying that token is on the feed yet.",
        )
    if response.status_code == 410:
        raise_coded(
            410,
            ErrorCode.atproto_challenge_expired,
            "That challenge expired before it was answered.",
        )
    raise_coded(
        502,
        ErrorCode.atproto_unavailable,
        "The identity organ could not reach that account's home.",
    )


async def key_challenge(public_key: str) -> dict:
    """Ask the organ for the canonical sign-this message.

    The message was minted with the realm inside and lives in the organ's
    one-shot book; :func:`key_verify` is the only call that can retire it.
    """
    response = await _organ_post(
        "/atp/key/challenge",
        {"realm": KEY_REALM, "public_key": public_key},
    )
    if response.status_code == 200:
        return response.json()
    if response.status_code == 400:
        raise_coded(
            400,
            ErrorCode.key_invalid,
            "That is not a key we know how to read.",
        )
    raise_coded(
        502,
        ErrorCode.atproto_unavailable,
        "The identity organ could not mint a challenge.",
    )


async def key_verify(public_key: str, signature: str) -> None:
    """Retire the book entry for ``public_key`` against ``signature``.

    Silence is the yes. Every refusal is coded; the organ's one-shot law
    means a bad signature still burns the challenge the caller must restart.
    """
    response = await _organ_post(
        "/atp/key/verify",
        {"public_key": public_key, "signature": signature},
    )
    if response.status_code == 200:
        return
    if response.status_code == 400:
        raise_coded(
            400,
            ErrorCode.key_invalid,
            "That is not a key we know how to read.",
        )
    if response.status_code == 403:
        raise_coded(
            403,
            ErrorCode.key_bad_signature,
            "That signature did not check out. Sign the exact text we gave you.",
        )
    if response.status_code == 410:
        raise_coded(
            410,
            ErrorCode.key_challenge_expired,
            "That sign-in expired before it finished; start again.",
        )
    if response.status_code == 404:
        raise_coded(
            404,
            ErrorCode.key_challenge_missing,
            "There is no key sign-in waiting on you. "
            "Start one to get your text to sign.",
        )
    raise_coded(
        502,
        ErrorCode.atproto_unavailable,
        "The identity organ could not check that signature.",
    )
