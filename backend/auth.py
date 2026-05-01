import hashlib
import hmac
import os
import secrets
import time

_sessions: dict[str, tuple[str, float]] = {}  # token → (username, expires)
SESSION_TTL = 60 * 60 * 8  # 8 hours


def _hash(password: str) -> str:
    salt = os.getenv("SECRET_KEY", "vostok-secret-2025")
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000).hex()


def verify(password: str, hashed: str) -> bool:
    return hmac.compare_digest(_hash(password), hashed)


def hash_password(password: str) -> str:
    return _hash(password)


def create_session(username: str) -> str:
    token = secrets.token_hex(32)
    _sessions[token] = (username, time.time() + SESSION_TTL)
    return token


def check_session(token: str) -> str | None:
    """Returns username if valid, else None."""
    entry = _sessions.get(token)
    if not entry:
        return None
    username, expires = entry
    if time.time() > expires:
        del _sessions[token]
        return None
    return username


def revoke_session(token: str):
    _sessions.pop(token, None)
