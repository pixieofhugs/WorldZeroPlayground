"""Key-sign-in validation (ADR-0088) — the local half only.

The crypto is NOT here. The atp organ (``services/atproto_identity.py`` is its
client) mints the challenge and verifies the signature with openssl one tier
below it, so one crypto library — and one organ — ever decides what a
signature means in the warren. What lives here is the refusal to waste its
time: a key or signature that fails base64 shape law is refused before the
wire, with the same coded errors the organ's answers would carry.

``provider_user_id`` for the lane is the base64 raw key itself: 32 bytes is
already the shortest honest name the key has.
"""
from __future__ import annotations

import base64
import binascii

from errors import ErrorCode, raise_coded


def decode_public_key(public_key_b64: str) -> bytes:
    """The raw 32 key bytes, or a coded 400. Base64-strict, length-exact."""
    try:
        raw = base64.b64decode(public_key_b64.encode("ascii"), validate=True)
    except (binascii.Error, UnicodeEncodeError):
        raise_coded(
            400,
            ErrorCode.key_invalid,
            "That is not a base64 key.",
        )
    if len(raw) != 32:
        raise_coded(
            400,
            ErrorCode.key_invalid,
            "That key is not 32 bytes.",
        )
    return raw


def decode_signature(signature_b64: str) -> bytes:
    """The raw 64 signature bytes, or a coded 403. Same law as the key's."""
    try:
        raw = base64.b64decode(signature_b64.encode("ascii"), validate=True)
    except (binascii.Error, UnicodeEncodeError):
        raise_coded(
            403,
            ErrorCode.key_bad_signature,
            "That signature did not check out.",
        )
    if len(raw) != 64:
        raise_coded(
            403,
            ErrorCode.key_bad_signature,
            "That signature did not check out.",
        )
    return raw
