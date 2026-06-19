"""Regression tests for the Stardance HTML parsers.

These guard against the scraping breaking silently when Stardance changes its
markup. They run against committed, anonymized fixtures in
``tests/fixtures/`` captured from the live site.

Run with either:
    python tests/test_parsers.py            # stdlib asserts, exit code
    pytest tests/test_parsers.py            # if pytest is installed
"""
from __future__ import annotations

import sys
from pathlib import Path

# Allow running both as `python tests/test_parsers.py` and as a pytest module
# without installing the package: put the community-edition root on sys.path so
# `backend.parsers` resolves.
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend import parsers  # noqa: E402

FIX = Path(__file__).resolve().parent / "fixtures"


def _read(name: str) -> str:
    return (FIX / name).read_text(encoding="utf-8")


# ----- queue ---------------------------------------------------------------


def test_queue_parses_ships_not_empty():
    """The headline regression: rows must not be silently dropped.

    Broke when Stardance removed the ``.ship-queue__cell-action`` "Open" link
    (commit 30674fde), which was the parser's only source for the ship id.
    """
    out = parsers.parse_queue(_read("queue.html"))
    assert out["ships"], "queue ships list is empty — row selector/id parsing is broken"
    # The captured fixture has a full page of 25 pending ships.
    assert len(out["ships"]) >= 20, f"expected ~25 ships, got {len(out['ships'])}"


def test_queue_ship_fields_populated():
    out = parsers.parse_queue(_read("queue.html"))
    ship = out["ships"][0]
    assert ship["id"], "ship id missing"
    assert isinstance(ship["id"], int)
    assert ship["projectTitle"], "project title missing"
    assert ship["ownerDisplayName"], "owner name missing"
    assert ship["ageText"], "age/wait text missing"
    assert ship["status"] in ("pending", "approved", "returned")
    # projectShipIdLabel should look like "#448"
    assert ship["projectShipIdLabel"].startswith("#")


def test_queue_stats_populated():
    out = parsers.parse_queue(_read("queue.html"))
    stats = out["stats"]
    assert stats["pending"] > 0, "pending count not parsed"
    assert stats["oldest_waiting_text"], "oldest waiting text missing"
    assert stats["approved"] + stats["returned"] > 0


def test_queue_leaderboards_populated():
    out = parsers.parse_queue(_read("queue.html"))
    lb = out["leaderboards"]
    # At least the weekly/alltime panels should have entries.
    assert lb["weekly"] or lb["alltime"], "leaderboards empty"


def test_queue_has_bad_review_is_class_based():
    """hasBadReview must key off the status-pill class, not the (renamed) text."""
    out = parsers.parse_queue(_read("queue.html"))
    for ship in out["ships"]:
        assert isinstance(ship["hasBadReview"], bool)


# ----- review (show page) --------------------------------------------------


def test_review_core_fields():
    out = parsers.parse_review(_read("review.html"), 0)
    assert out["id"]
    assert out["projectTitle"], "title missing"
    assert out["status"] in ("pending", "approved", "returned")


def test_review_merged_submission_panel():
    """Description / AI Declaration / Links were merged into the single
    "Submission" panel in Stardance commit ff08aae8 and must still be parsed."""
    out = parsers.parse_review(_read("review.html"), 0)
    assert out["description"], "description empty — merged-panel parsing broken"
    assert out["aiDeclaration"] is not None
    links = out["links"]
    assert "repo" in links or "demo" in links, f"links missing: {links}"
    # The project-page link drives the /projects/<id> enrichment in app.py.
    assert "project" in links, f"project link missing: {links}"


def test_review_claim_form():
    out = parsers.parse_review(_read("review.html"), 0)
    claim = out["claim"]
    assert claim["action"], "claim form action missing"
    assert claim["authenticityToken"], "authenticity token missing"
    assert claim["method"], "claim form method missing"


def test_review_submission_meta():
    out = parsers.parse_review(_read("review.html"), 0)
    meta = out["submissionMeta"]
    assert meta.get("submitter"), "submitter missing"


# ----- mystats -------------------------------------------------------------


def test_mystats_core():
    out = parsers.parse_mystats(_read("mystats.html"))
    assert out["stats"]["total"] > 0, "total reviews not parsed"
    assert out["reviewer"]["name"], "reviewer name missing"
    assert out["history"], "history table empty"


# ----- compact age text ----------------------------------------------------


def test_age_hours_compact_badge():
    """Wait badges are now compact ('9d'); the hour helper must handle them."""
    assert parsers.age_hours_from_text("9d") == 9 * 24
    assert parsers.age_hours_from_text("6h") == 6
    assert parsers.age_hours_from_text("45m") == 0  # under an hour


def test_age_hours_full_words_still_work():
    # Backward-compat with the old "6 days old" phrasing.
    assert parsers.age_hours_from_text("6 days old") == 6 * 24
    assert parsers.age_hours_from_text("2 hours old") == 2


# ----- runner for `python tests/test_parsers.py` ---------------------------


def _main() -> int:
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failures = 0
    for fn in fns:
        try:
            fn()
            print(f"  PASS  {fn.__name__}")
        except AssertionError as exc:
            failures += 1
            print(f"  FAIL  {fn.__name__}: {exc}")
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print(f"  ERROR {fn.__name__}: {type(exc).__name__}: {exc}")
    print(f"\n{len(fns) - failures}/{len(fns)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(_main())
