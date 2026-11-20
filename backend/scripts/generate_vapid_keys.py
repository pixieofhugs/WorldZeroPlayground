"""Print a VAPID key pair as ``.env`` lines: ``scripts/wz vapid``."""

import base64

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


vapid = Vapid()
vapid.generate_keys()
private = vapid.private_key.private_numbers().private_value.to_bytes(32, "big")
public = vapid.public_key.public_bytes(
    serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
)
print(f"VAPID_PUBLIC_KEY={_b64url(public)}")
print(f"VAPID_PRIVATE_KEY={_b64url(private)}")
