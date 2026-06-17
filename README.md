# Stardance Community Dash

A community-built, Horizons-inspired reviewer dashboard for Stardance shipwrights.

It now has a real **FastAPI backend** that proxies Stardance HTML pages using a
stored reviewer session cookie, plus a **React + Vite frontend** that talks to
that backend. No more fixture files for normal operation.

## What's built

- **Queue** — grid/list/table views, search, type filters, sort, claim status,
  live wait-time badges, and polling every 30 seconds.
- **Review page** — README (rendered as Markdown), project info, live GitHub
  repo stats/commits, verdict panel with claim/unclaim/submit, private notes,
  review checklist, and review history.
- **My stats** — reviewer totals, approval rate, stardust balance, payout request,
  and history (inlined into the queue page stats card).
- **Theme** — Catppuccin Mocha by default, implemented through semantic CSS
  variables so swapping themes later is just changing variable values.

## Tech stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Lucide icons
- react-markdown + remark-gfm
- Python 3.14 + FastAPI + uvicorn + httpx + BeautifulSoup
- SQLite for reviewer notes, checklist state, and cached cookies

## Run locally

You need two terminals.

### 1. Backend

```bash
cd community-edition
.venv/bin/pip install -r backend/requirements.txt
export STARDANCE_SESSION_COOKIE='<paste your _stardance_session_v3 cookie here>'
export GITHUB_TOKEN='<optional GitHub personal access token>'
.venv/bin/uvicorn backend.app:app --reload --port 8000
```

The backend stores the rotated Stardance cookie in `backend/data/dash.db`, so
after the first startup you can omit `STARDANCE_SESSION_COOKIE` until the
session dies.

### 2. Frontend

```bash
cd community-edition/frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Vite proxies `/api/*` to the backend automatically (see `vite.config.ts`).

## Updating demo fixtures (optional)

The fixtures in `frontend/public/fixtures/` are no longer used by the app, but
you can still regenerate them:

```bash
cd community-edition
.venv/bin/python scripts/fetch_fixtures.py   # scrape live Stardance pages
.venv/bin/python scripts/enrich_fixtures.py  # add mock GitHub/checklist/user data
```

## Backend API

See `backend/README.md` for the full endpoint list.

Key routes:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/queue` | Queue + stats + leaderboards (all pages merged) |
| `GET` | `/api/review/:id` | Review detail (includes notes + checklist) |
| `POST` | `/api/review/:id/claim` | Claim |
| `DELETE` | `/api/review/:id/claim` | Unclaim |
| `PATCH` | `/api/review/:id` | Submit verdict (multipart, optional video) |
| `GET` | `/api/mystats` | Reviewer stats + history |
| `GET` | `/api/github?repoUrl=…` | Live GitHub repo data (cached 5 min) |
| `PUT` | `/api/notes/:id` | Save reviewer notes |
| `PUT` | `/api/checklist/:id` | Save checklist state |

## What's not in this phase

- AI sw-reviewer PDF generation (out of scope for this milestone).

## Next steps

- AI sw-reviewer PDF generation.
- Project-page scraping for richer review detail (screenshot, real project id,
  project type on the review page, owner slack id).
- My Stats dedicated page / payout history improvements.
- HCA OAuth login flow so the cookie doesn't need to be pasted manually.
