from __future__ import annotations

import os
from pathlib import Path

BASE = "https://stardance.hackclub.com"
COOKIE_NAME = "_stardance_session_v3"

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "dash.db"


def env(name: str, default: str | None = None) -> str | None:
    val = os.environ.get(name)
    return val if val else default


def env_required(name: str) -> str:
    val = os.environ.get(name)
    if not val:
        raise RuntimeError(f"Missing required env var: {name}")
    return val


def session_cookie() -> str:
    """Pull the reviewer session cookie from env or the on-disk store."""
    from .db import load_session_cookie

    cookie = env("STARDANCE_SESSION_COOKIE")
    if cookie:
        return cookie
    stored = load_session_cookie()
    if stored:
        return stored
    raise RuntimeError(
        "No Stardance session cookie configured. Set STARDANCE_SESSION_COOKIE "
        "or restart with the cookie in the .env file."
    )


def github_token() -> str | None:
    return env("GITHUB_TOKEN")
