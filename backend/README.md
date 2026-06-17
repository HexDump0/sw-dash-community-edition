# Stardance Community Dash — backend

Python FastAPI proxy that talks to Stardance on behalf of the frontend
and stores per-reviewer state (notes, checklist state, cached reviewer
identity, rotated session cookies) in SQLite.

## Run

```bash
cd community-edition
.venv/bin/pip install -r backend/requirements.txt
export STARDANCE_SESSION_COOKIE='<paste cookie here>'
export GITHUB_TOKEN='<optional>'
.venv/bin/uvicorn backend.app:app --reload --port 8000
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`, so
running the frontend in another terminal as usual will hit the backend
transparently.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`  | `/api/queue` | Parsed queue + stats + leaderboards (paginated) |
| `GET`  | `/api/review/{certId}` | Parsed review detail (with notes + checklist) |
| `POST` | `/api/review/{certId}/claim` | Claim the cert |
| `DELETE` | `/api/review/{certId}/claim` | Release the cert |
| `GET`  | `/api/next?skip=<ids>` | Skip to the next reviewable cert (releases other claims) |
| `PATCH` | `/api/review/{certId}` | Submit a verdict (`status`, `feedback`, optional `video`) |
| `GET`  | `/api/mystats` | Reviewer totals + history + payout modal info |
| `POST` | `/api/mystats/payout` | Submit a payout request |
| `GET`  | `/api/notes/{certId}` / `PUT` | Reviewer notes (project + user) |
| `GET`  | `/api/checklist/{certId}` / `PUT` | Review checklist state |
| `GET`  | `/api/reviewer` | Current reviewer identity (cached) |
| `GET`  | `/api/github?repoUrl=…` | Live GitHub repo info (5 min cache) |
| `GET`  | `/api/readme?url=…` | Fetch a raw README via gh-proxy |
| `GET`  | `/api/health` | DB + cookie health check |

## Storage

SQLite at `backend/data/dash.db`. Tables:

* `sessions` — single row with the latest rotated cookie + cached CSRF
* `project_notes(cert_id, project_note, user_note, updated_at)`
* `review_checklists(cert_id, checked_items, updated_at)` (JSON)
* `reviewer_cache` — latest reviewer identity
* `review_meta` — last fetched review payload per cert

Reset with `rm backend/data/dash.db`.
