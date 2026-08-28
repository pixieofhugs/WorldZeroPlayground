"""Key-lane validation (ADR-0088): the local refusals live here.

The crypto lives in the atp organ and comes back through
``services/atproto_identity``; what this module still decides is base64 shape
law — refuse a malformed key or signature before anyone waits on a wire.
"""
import base64

import pytest
from fastapi import HTTPException

from errors import ErrorCode
from services.key_auth import decode_public_key, decode_signature

_PK_B64 = base64.b64encode(bytes(32)).decode()
_SIG_B64 = base64.b64encode(bytes(64)).decode()


def _code(exc: pytest.ExceptionInfo[HTTPException]) -> str:
    return exc.value.detail["code"]


def test_decode_public_key_ok():
    assert decode_public_key(_PK_B64) == bytes(32)


def test_decode_public_key_not_base64():
    with pytest.raises(HTTPException) as exc:
        decode_public_key("not***base64")
    assert _code(exc) == ErrorCode.key_invalid


def test_decode_public_key_wrong_length():
    with pytest.raises(HTTPException) as exc:
        decode_public_key(base64.b64encode(bytes(16)).decode())
    assert _code(exc) == ErrorCode.key_invalid


def test_decode_public_key_non_ascii():
    with pytest.raises(HTTPException) as exc:
        decode_public_key("ø" + _PK_B64[1:])
    assert _code(exc) == ErrorCode.key_invalid


def test_decode_signature_ok():
    assert decode_signature(_SIG_B64) == bytes(64)


def test_decode_signature_not_base64():
    with pytest.raises(HTTPException) as exc:
        decode_signature("~!~")
    assert _code(exc) == ErrorCode.key_bad_signature


def test_decode_signature_wrong_length():
    with pytest.raises(HTTPException) as exc:
        decode_signature(_PK_B64)  # 32 bytes: a perfect key is a broken signature
    assert _code(exc) == ErrorCode.key_bad_signature


def test_decode_signature_non_ascii():
    with pytest.raises(HTTPException) as exc:
        decode_signature("ø" + _SIG_B64[1:])
    assert _code(exc) == ErrorCode.key_bad_signature
