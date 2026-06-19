# Parser regression fixtures

These are real Stardance HTML pages (anonymized) used by the parser tests in
`tests/test_parsers.py` to guard against the scraping breaking silently when
Stardance changes its markup.

## How they were captured

```bash
# with a valid reviewer cookie
curl -s -b "_stardance_session_v3=..." \
     https://stardance.hackclub.com/admin/certification/ship -o /tmp/queue.html
curl -s -b "_stardance_session_v3=..." \
     https://stardance.hackclub.com/admin/certification/ship/<ID> -o /tmp/review.html
curl -s -b "_stardance_session_v3=..." \
     https://stardance.hackclub.com/admin/certification/ship/mystats -o /tmp/mystats.html
```

Then sanitized with `tests/sanitize_fixtures.py` to strip CSRF / authenticity
tokens, Slack user ids, and any other session-scoped values before committing.

## Why they exist

Stardance's queue table was restructured in commit `30674fde` (June 2026),
removing the `.ship-queue__cell-action` "Open" link the parser read the ship id
from, and the review page merged Description / AI Declaration / Links into a
single "Submission" panel in `ff08aae8`. Both changes silently emptied the
queue and the review body. These fixtures let a `pytest` run catch that class
of regression before it ships.
