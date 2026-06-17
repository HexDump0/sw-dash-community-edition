from __future__ import annotations

import json
import secrets
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import DB_PATH

_LOCK = threading.Lock()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


_CONN = _connect()


def init() -> None:
    with _LOCK:
        _CONN.executescript(
            """
            CREATE TABLE IF NOT EXISTS reviewer_sessions (
                slack_user_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                cookie_value TEXT NOT NULL,
                csrf_token TEXT,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS auth_tokens (
                token_hash TEXT PRIMARY KEY,
                slack_user_id TEXT NOT NULL REFERENCES reviewer_sessions(slack_user_id) ON DELETE CASCADE,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_auth_tokens_slack_user_id ON auth_tokens(slack_user_id);

            CREATE TABLE IF NOT EXISTS project_notes (
                cert_id INTEGER PRIMARY KEY,
                project_note TEXT NOT NULL DEFAULT '',
                user_note TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS review_checklists (
                cert_id INTEGER PRIMARY KEY,
                checked_items TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reviewer_cache (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL,
                fetched_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS review_meta (
                cert_id INTEGER PRIMARY KEY,
                project_title TEXT,
                owner_display_name TEXT,
                payload TEXT NOT NULL,
                fetched_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS feedback_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL UNIQUE,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _hash_token(token: str) -> str:
    """Return a deterministic hash for an auth token."""
    import hashlib

    return hashlib.sha256(token.encode()).hexdigest()


# ----- reviewer sessions ----------------------------------------------------


ReviewerSession = dict[str, Any]


def save_reviewer_session(slack_user_id: str, name: str, cookie: str, csrf_token: str | None = None) -> None:
    with _LOCK:
        _CONN.execute(
            "INSERT INTO reviewer_sessions (slack_user_id, name, cookie_value, csrf_token, updated_at) "
            "VALUES (?, ?, ?, ?, ?) ON CONFLICT(slack_user_id) DO UPDATE SET "
            "name = excluded.name, cookie_value = excluded.cookie_value, "
            "csrf_token = excluded.csrf_token, updated_at = excluded.updated_at",
            (slack_user_id, name, cookie, csrf_token, _now()),
        )


def load_reviewer_session(slack_user_id: str) -> ReviewerSession | None:
    with _LOCK:
        row = _CONN.execute(
            "SELECT slack_user_id, name, cookie_value, csrf_token, updated_at "
            "FROM reviewer_sessions WHERE slack_user_id = ?",
            (slack_user_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "slackUserId": row["slack_user_id"],
        "name": row["name"],
        "cookie": row["cookie_value"],
        "csrfToken": row["csrf_token"] or None,
        "updatedAt": row["updated_at"],
    }


def load_reviewer_session_by_cookie(cookie: str) -> ReviewerSession | None:
    with _LOCK:
        row = _CONN.execute(
            "SELECT slack_user_id, name, cookie_value, csrf_token, updated_at "
            "FROM reviewer_sessions WHERE cookie_value = ?",
            (cookie,),
        ).fetchone()
    if not row:
        return None
    return {
        "slackUserId": row["slack_user_id"],
        "name": row["name"],
        "cookie": row["cookie_value"],
        "csrfToken": row["csrf_token"] or None,
        "updatedAt": row["updated_at"],
    }


def delete_reviewer_session(slack_user_id: str) -> None:
    with _LOCK:
        _CONN.execute("DELETE FROM reviewer_sessions WHERE slack_user_id = ?", (slack_user_id,))


def list_reviewer_sessions() -> list[ReviewerSession]:
    with _LOCK:
        rows = _CONN.execute(
            "SELECT slack_user_id, name, cookie_value, csrf_token, updated_at "
            "FROM reviewer_sessions ORDER BY name"
        ).fetchall()
    return [
        {
            "slackUserId": r["slack_user_id"],
            "name": r["name"],
            "cookie": r["cookie_value"],
            "csrfToken": r["csrf_token"] or None,
            "updatedAt": r["updated_at"],
        }
        for r in rows
    ]


# ----- auth tokens ----------------------------------------------------------


def create_auth_token(slack_user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    with _LOCK:
        _CONN.execute(
            "INSERT INTO auth_tokens (token_hash, slack_user_id, created_at) VALUES (?, ?, ?)",
            (token_hash, slack_user_id, _now()),
        )
    return token


def delete_auth_token(token: str) -> None:
    token_hash = _hash_token(token)
    with _LOCK:
        _CONN.execute("DELETE FROM auth_tokens WHERE token_hash = ?", (token_hash,))


def lookup_auth_token(token: str) -> str | None:
    token_hash = _hash_token(token)
    with _LOCK:
        row = _CONN.execute(
            "SELECT slack_user_id FROM auth_tokens WHERE token_hash = ?", (token_hash,)
        ).fetchone()
    return row["slack_user_id"] if row else None


# ----- legacy session migration ---------------------------------------------


def load_legacy_session_cookie() -> str | None:
    """Load the old single-row session cookie if it still exists."""
    with _LOCK:
        table = _CONN.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
        ).fetchone()
        if not table:
            return None
        row = _CONN.execute("SELECT cookie_value FROM sessions WHERE id = 1").fetchone()
        return row["cookie_value"] if row else None


def drop_legacy_sessions() -> None:
    with _LOCK:
        _CONN.execute("DROP TABLE IF EXISTS sessions")


# ----- notes / checklist / reviewer cache -----------------------------------


def get_notes(cert_id: int) -> dict[str, str]:
    with _LOCK:
        row = _CONN.execute(
            "SELECT project_note, user_note FROM project_notes WHERE cert_id = ?",
            (cert_id,),
        ).fetchone()
    if not row:
        return {"projectNote": "", "userNote": ""}
    return {"projectNote": row["project_note"], "userNote": row["user_note"]}


def save_notes(cert_id: int, project_note: str, user_note: str) -> None:
    with _LOCK:
        _CONN.execute(
            "INSERT INTO project_notes (cert_id, project_note, user_note, updated_at) "
            "VALUES (?, ?, ?, ?) ON CONFLICT(cert_id) DO UPDATE SET "
            "project_note = excluded.project_note, user_note = excluded.user_note, "
            "updated_at = excluded.updated_at",
            (cert_id, project_note, user_note, _now()),
        )


def get_checklist(cert_id: int) -> list[int]:
    with _LOCK:
        row = _CONN.execute(
            "SELECT checked_items FROM review_checklists WHERE cert_id = ?",
            (cert_id,),
        ).fetchone()
    if not row:
        return []
    try:
        return [int(x) for x in json.loads(row["checked_items"])]
    except (json.JSONDecodeError, ValueError):
        return []


def save_checklist(cert_id: int, checked_items: list[int]) -> None:
    with _LOCK:
        _CONN.execute(
            "INSERT INTO review_checklists (cert_id, checked_items, updated_at) "
            "VALUES (?, ?, ?) ON CONFLICT(cert_id) DO UPDATE SET "
            "checked_items = excluded.checked_items, updated_at = excluded.updated_at",
            (cert_id, json.dumps(checked_items), _now()),
        )


def cache_reviewer(data: dict[str, Any]) -> None:
    with _LOCK:
        _CONN.execute(
            "INSERT INTO reviewer_cache (id, data, fetched_at) VALUES (1, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET data = excluded.data, "
            "fetched_at = excluded.fetched_at",
            (json.dumps(data), _now()),
        )


def load_reviewer() -> dict[str, Any] | None:
    with _LOCK:
        row = _CONN.execute("SELECT data, fetched_at FROM reviewer_cache WHERE id = 1").fetchone()
    if not row:
        return None
    try:
        return json.loads(row["data"])
    except json.JSONDecodeError:
        return None


def cache_review(cert_id: int, project_title: str, owner: str, payload: dict[str, Any]) -> None:
    with _LOCK:
        _CONN.execute(
            "INSERT INTO review_meta (cert_id, project_title, owner_display_name, payload, fetched_at) "
            "VALUES (?, ?, ?, ?, ?) ON CONFLICT(cert_id) DO UPDATE SET "
            "project_title = excluded.project_title, "
            "owner_display_name = excluded.owner_display_name, "
            "payload = excluded.payload, fetched_at = excluded.fetched_at",
            (cert_id, project_title, owner, json.dumps(payload), _now()),
        )


def load_cached_reviews() -> list[dict[str, Any]]:
    with _LOCK:
        rows = _CONN.execute(
            "SELECT cert_id, project_title, owner_display_name, fetched_at "
            "FROM review_meta ORDER BY fetched_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_feedback_templates() -> list[dict[str, Any]]:
    with _LOCK:
        rows = _CONN.execute(
            "SELECT id, label, body, created_at FROM feedback_templates ORDER BY label"
        ).fetchall()
    return [dict(r) for r in rows]


def save_feedback_template(label: str, body: str) -> dict[str, Any]:
    with _LOCK:
        _CONN.execute(
            "INSERT INTO feedback_templates (label, body, created_at) VALUES (?, ?, ?) "
            "ON CONFLICT(label) DO UPDATE SET body = excluded.body, "
            "created_at = excluded.created_at",
            (label, body, _now()),
        )
        row = _CONN.execute(
            "SELECT id, label, body, created_at FROM feedback_templates WHERE label = ?",
            (label,),
        ).fetchone()
    return dict(row) if row else {"id": 0, "label": label, "body": body, "created_at": _now()}


init()
