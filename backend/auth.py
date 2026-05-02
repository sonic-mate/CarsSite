import os
import secrets

import bcrypt
import redis as _redis_lib

SESSION_TTL = 60 * 60 * 8  # 8 hours
_SESSION_PREFIX = "session:"

_r: _redis_lib.Redis | None = None


def _redis() -> _redis_lib.Redis:
    global _r
    if _r is None:
        url = os.getenv("REDIS_URL", "redis://redis:6379/0")
        _r = _redis_lib.from_url(url, decode_responses=True)
    return _r


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def create_session(username: str) -> str:
    token = secrets.token_hex(32)
    _redis().setex(f"{_SESSION_PREFIX}{token}", SESSION_TTL, username)
    return token


def check_session(token: str) -> str | None:
    r = _redis()
    key = f"{_SESSION_PREFIX}{token}"
    username = r.get(key)
    if not username:
        return None
    r.expire(key, SESSION_TTL)  # sliding window
    return username


def revoke_session(token: str):
    _redis().delete(f"{_SESSION_PREFIX}{token}")
