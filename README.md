# Stardance Community Dash

A community-built, Horizons-inspired reviewer dashboard for Stardance shipwrights.

This is the **frontend-first demo** inside `community-edition/frontend`. It uses real fixtures scraped from the live Stardance admin dash with the provided reviewer token, plus mock data for the features Stardance doesn't expose directly (GitHub repo stats, AI reviewer report, user notes).

## What's built

- **Queue** — compact list view by default, with optional grid and table views; search, type filters, sort, claim status, and wait-time badges. Shows only pending projects.
- **Review page** — README (rendered as Markdown), Project info (description, AI declaration, links, submission meta, devlogs, banner/screenshot), GitHub stats/commits, and AI Review in the center tabs; verdict panel on the right; user info, private notes, and review history on the left.
- **My Stats page** — reviewer totals, approval rate, stardust balance, payout request, and history.
- **Theme** — Catppuccin Mocha by default, implemented through semantic CSS variables so swapping themes later is just changing variable values.

## Tech stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Lucide icons
- react-markdown + remark-gfm

## Run locally

```bash
cd community-edition/frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Refresh demo fixtures

```bash
cd community-edition
.venv/bin/python scripts/fetch_fixtures.py   # scrape live Stardance pages
.venv/bin/python scripts/enrich_fixtures.py  # add mock GitHub/checklist/user data
```

The session token is hard-coded in `scripts/fetch_fixtures.py` for the demo.

## Next steps (not yet built)

- Real backend proxy to relay Stardance requests with stored reviewer cookies.
- Live GitHub API integration.
- Real sw-reviewer PDF generation.
- Live claim/release/verdict submission.
- Payout request relay.
- Real-time claim countdowns and queue polling.
