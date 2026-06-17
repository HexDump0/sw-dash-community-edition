# Stardance Community Dash

A community-built, Horizons-inspired reviewer dashboard for Stardance shipwrights.

It now has a real **FastAPI backend** that proxies Stardance HTML pages using
per-reviewer session cookies, plus a **React + Vite frontend** that talks to that
backend. No more fixture files for normal operation.

## What's built

- **Queue** — grid/list/table views, search, type filters, sort, claim status,
  live wait-time badges, and polling every 30 seconds.
- **Review page** — README (rendered as Markdown), project info, live GitHub
  repo stats/commits, verdict panel with claim/unclaim/submit, private notes,
  review checklist, and review history.
- **My stats** — reviewer totals, approval rate, stardust balance, payout request,
  and history (inlined into the queue page stats card).
- **Multi-reviewer auth** — each reviewer logs in by pasting their own curl
  command; sessions are stored keyed by Slack id so 10–15 reviewers can share
  one backend without leaking cookies.
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
- SQLite for reviewer notes, checklist state, cached cookies, and auth tokens

## Run locally

You need two terminals.

### 1. Backend

```bash
cd community-edition
.venv/bin/pip install -r backend/requirements.txt
export GITHUB_TOKEN='<optional GitHub personal access token>'
.venv/bin/uvicorn backend.app:app --reload --port 8000
```

The backend no longer requires `STARDANCE_SESSION_COOKIE` to start. Reviewers
log in through the frontend.

If you do set `STARDANCE_SESSION_COOKIE`, the backend will pre-warm one
reviewer session from it on startup so the first user does not have to log in.

### 2. Frontend

```bash
cd community-edition/frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Vite proxies `/api/*` to the backend automatically (see `vite.config.ts`).

## Logging in

1. Open the frontend and click **Log in** in the top-right reviewer badge.
2. Copy a curl request to any Stardance page from your browser's DevTools
   Network tab. It will look something like:

   ```bash
   curl 'https://stardance.hackclub.com/admin/certification/ship' \
     -H 'accept: text/html,...' \
     -H 'user-agent: ...' \
     -b '_stardance_session_v3=<your cookie>'
   ```

3. Paste the whole command into the popup and click **Log in**.
4. The backend extracts `_stardance_session_v3`, validates it by fetching your
   mystats page, and stores the session keyed by your Slack id.

Click the badge again and choose **Log out** to remove your session.

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
| `POST` | `/api/login` | Paste curl command; returns bearer token + reviewer |
| `POST` | `/api/logout` | Invalidate token and delete stored session cookie |
| `GET` | `/api/me` | Current reviewer info |
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
