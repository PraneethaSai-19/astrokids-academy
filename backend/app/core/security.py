"""Password hashing (Argon2) and JWT helpers."""
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import get_settings

_hasher = PasswordHasher()

SCOPE_PARENT = "parent"          # normal app session (parent logged in, child playing)
SCOPE_PARENT_GATE = "parent_gate"  # short-lived token after re-entering the password


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_token(parent_id: int, token_version: int, scope: str = SCOPE_PARENT) -> tuple[str, int]:
    settings = get_settings()
    minutes = settings.parent_gate_token_minutes if scope == SCOPE_PARENT_GATE else settings.access_token_minutes
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(parent_id),
        "ver": token_version,
        "scope": scope,
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, minutes * 60


def decode_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
