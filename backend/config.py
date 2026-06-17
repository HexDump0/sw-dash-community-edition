from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Look for .env in the project root (community-edition/) first, then fall back to backend/.
_project_root = Path(__file__).resolve().parent.parent
ENV_FILE = _project_root / ".env"
if not ENV_FILE.exists():
    ENV_FILE = _project_root / "backend" / ".env"
load_dotenv(ENV_FILE, override=False)

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


def reviewer_base_url() -> str:
    return env("REVIEWER_BASE_URL", "http://127.0.0.1:4391").rstrip("/")


def reviewer_api_key() -> str | None:
    return env("REVIEWER_API_KEY")
