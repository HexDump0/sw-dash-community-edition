# Stardance Community Dash

A community-built, Horizons-inspired reviewer dashboard for Stardance shipwrights.

This is the **frontend-first demo** inside `community-edition/frontend`. It uses real fixtures scraped from the live Stardance admin dash with the provided reviewer token, plus mock data for the features Stardance doesn't expose directly (GitHub repo stats, review checklist, AI reviewer report, user notes).

## What's built

- **Queue gallery** — Horizons-style grid/list view with search, type filters, sort, view toggle, claim status, and wait-time badges.
- **3-column review page** — README, Demo, Project Card, AI Review, and Verdict tabs; left panel with user info, notes, and review history; right panel with GitHub stats/commits and review checklist.
- **My Stats page** — reviewer totals, approval rate, stardust balance, payout request, and history.
- **Stardance theme** — deep space background, pastel accents (mint/lilac/blue/salmon/yellow/cream), Exo 2 + Playfair Display typography.

## Tech stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion
- Lucide icons

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
