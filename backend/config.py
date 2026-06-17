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


def github_token() -> str | None:
    return env("GITHUB_TOKEN")
