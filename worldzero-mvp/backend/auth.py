import os
from datetime import datetime, timedelta
from typing import Optional

from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import Account, Character

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-32-chars!!")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def create_token(account_id: int) -> str:
    payload = {
        "account_id": account_id,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_current_account(request: Request, db: Session = Depends(get_db)) -> Account:
    token = request.cookies.get("wz_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    account = db.query(Account).filter(Account.id == payload["account_id"]).first()
    if not account or not account.is_active:
        raise HTTPException(status_code=401, detail="Account not found")
    return account


def get_current_account_optional(request: Request, db: Session = Depends(get_db)) -> Optional[Account]:
    token = request.cookies.get("wz_token")
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    return db.query(Account).filter(Account.id == payload["account_id"]).first()


def get_active_character(account: Account, db: Session) -> Optional[Character]:
    return (
        db.query(Character)
        .filter(Character.account_id == account.id, Character.is_active == True)
        .first()
    )
