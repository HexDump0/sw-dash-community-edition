#!/usr/bin/env python3
"""Fetch live Stardance shipwright pages and save parsed fixtures for the frontend."""

import json
import re
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://stardance.hackclub.com"
_COOKIE_VALUE = "9%2FpfQI2yzC%2B69nlRVNiDNfYZuYZjkuPgZ1M2mnixlfvr41wTQkdMlXywo6pCLVS9yGeM8ZuKKgqU4O0N8KtMToMOYg8jAIJ%2F2gdmfF0P9%2BlAIwYv3GVbjUJE0E56HjTOIpN752hGjVD8b2VXaZmZhofEYwFlK1pPtRkibh2%2BdiDleQjmXRzbuHBsPZiFLbDXjr42QxZYotNEeSM3W3Di9K9PWzHfQit%2FZ%2BJTJtWFGa2CTnJS7TD1AuuEmllWbxoKb1lBN4xDaKLUjHN5xd62m4g%2BxOCx%2BfJxO52%2F5VEBzVI0LQibNXwaKQ%2FiSuI8g1Xu7DImDTNB1gyhdvUUrc7Qdz5i%2BGJitIP04O7uE9y9CfuU055%2FmKZfVL%2FDs4RTYNQ8r5KbxTRMDWDfCCPSvwVHr5jfpeJrwFV84IcI2cHR9g9HG3NVM2qI3SWjxwnbff3pgdWLkSVoNimMvvI3nmEiHCd8kJF9kEgEXSkcOUOOCMRUJnl%2BqgOlfc4f%2F75%2BjFA2coFmLK1iiop%2FnE9R6fg0cIVEsMZY%2FgYWhvkrs9%2BFNigmUJLpSjhVPNCHITtX9mOfmVaw--JgUbtoP4gNI9ji0m--lqXPpjHkL5bMOTHpQaKrzg%3D%3D"
COOKIE = {"_stardance_session_v3": _COOKIE_VALUE}

OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
}


def get(path: str) -> BeautifulSoup:
    url = urljoin(BASE, path)
    resp = requests.get(url, headers=HEADERS, cookies=COOKIE, timeout=30)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def parse_int(text: str | None) -> int | None:
    if not text:
        return None
    nums = re.findall(r"-?\d+", text.replace(",", ""))
    return int(nums[0]) if nums else None


def text_of(el) -> str:
    return el.get_text(strip=True) if el else ""


def parse_queue() -> dict:
    soup = get("/admin/certification/ship")

    stats: dict[str, any] = {}

    # Today's progress net
    net_el = soup.select_one(".ship-queue__net")
    if net_el:
        stats["net_flow"] = parse_int(net_el.get_text()) or 0
        stats["net_positive"] = "is-positive" in net_el.get("class", [])

    # Metrics tiles
    metrics = soup.select(".ship-queue__metric")
    for m in metrics:
        label = text_of(m.select_one(".ship-queue__label")).lower()
        value_el = m.select_one(".ship-queue__metric-value, .ship-queue__metric-link")
        value = text_of(value_el)
        if "in queue" in label:
            stats["pending"] = parse_int(value) or 0
        elif "oldest waiting" in label:
            stats["oldest_waiting_text"] = value
            link = value_el.get("href") if value_el else None
            stats["oldest_waiting_id"] = parse_int(link) if link else None
        elif "approval rate" in label:
            stats["approval_rate"] = parse_int(value)
        elif "reviewed this week" in label:
            stats["decisions_this_week"] = parse_int(value) or 0
        elif "waiting too long" in label:
            stats["overdue_pending"] = parse_int(value) or 0

    # All-time tallies
    alltime = soup.select_one(".ship-queue__alltime")
    if alltime:
        for tally in alltime.select(".ship-queue__tally"):
            txt = text_of(tally).lower()
            n = parse_int(txt) or 0
            if "approved" in txt:
                stats["approved"] = n
            elif "returned" in txt:
                stats["returned"] = n
            elif "reviewed" in txt:
                stats["decided"] = n

    # Leaderboards
    leaderboards: dict[str, list[dict]] = {"daily": [], "weekly": [], "alltime": []}
    panels = soup.select(".ship-queue__ranks")
    for panel in panels:
        period = panel.get("data-period")
        rows = []
        for rank in panel.select(".ship-queue__rank"):
            rows.append({
                "position": parse_int(text_of(rank.select_one(".ship-queue__rank-pos"))),
                "name": text_of(rank.select_one(".ship-queue__rank-name")),
                "count": parse_int(text_of(rank.select_one(".ship-queue__rank-count"))) or 0,
            })
        if period in leaderboards:
            leaderboards[period] = rows

    # Ships table
    ships = []
    for row in soup.select(".ship-queue__table tbody tr"):
        title_el = row.select_one(".ship-queue__project-title")
        open_link = row.select_one(".ship-queue__cell-action a")
        ship_id = parse_int(open_link.get("href")) if open_link else None
        if not ship_id:
            continue

        claim_flag = row.select_one(".ship-queue__claim-flag")
        claim_state = None
        if claim_flag:
            classes = claim_flag.get("class", [])
            if "ship-queue__claim-flag--open" in classes:
                claim_state = "open"
            elif "ship-queue__claim-flag--locked" in classes:
                claim_state = "locked"

        status_pill = row.select_one(".status-pill")
        ships.append({
            "id": ship_id,
            "projectTitle": text_of(title_el),
            "projectShipIdLabel": text_of(row.select_one(".ship-queue__project-id")),
            "ownerDisplayName": text_of(row.select_one(".ship-queue__project-meta span")).replace("by ", ""),
            "ageText": text_of(row.select_one(".ship-queue__project-meta")),
            "status": _status_from_pill(status_pill),
            "hasBadReview": "bad review" in text_of(status_pill).lower(),
            "claimState": claim_state,
            "claimReviewerDisplayName": text_of(row.select_one(".ship-queue__claim-by")),
            "claimExpiresAt": row.select_one(".ship-queue__countdown").get("data-expires-at") if row.select_one(".ship-queue__countdown") else None,
            "isOwnProject": bool(row.select_one(".ship-queue__type-tag--own")),
            "projectType": text_of(row.select_one(".ship-queue__type-tag:not(.ship-queue__type-tag--own)")),
        })

    return {
        "stats": stats,
        "leaderboards": leaderboards,
        "ships": ships,
        "status": "pending",
        "sort": "oldest",
    }


def _status_from_pill(pill) -> str:
    if not pill:
        return "pending"
    classes = pill.get("class", [])
    for s in ["approved", "returned", "pending"]:
        if f"status-pill--{s}" in classes:
            return s
    return "pending"


def parse_review(ship_id: int) -> dict:
    soup = get(f"/admin/certification/ship/{ship_id}")

    title = text_of(soup.select_one(".ship-review__title h1"))
    status = _status_from_pill(soup.select_one(".ship-review__title .status-pill"))
    cert_id = parse_int(text_of(soup.select_one(".ship-review__id")))

    # Momentum
    momentum = {}
    momentum_count = soup.select_one(".ship-review__momentum-count")
    if momentum_count:
        momentum["count"] = parse_int(text_of(momentum_count)) or 0
    momentum["label"] = text_of(soup.select_one(".ship-review__momentum-label"))

    # Details panels
    description = ""
    ai_declaration = ""
    links = {}
    submission_meta = {}
    returned_alert = None

    for panel in soup.select(".ship-review__panel, .ship-review__return-alert"):
        title_el = panel.select_one(".ship-review__panel-title, .ship-review__return-alert-title")
        panel_title = text_of(title_el)

        if "returned from ysws review" in panel_title.lower():
            returned_alert = {
                "by": text_of(panel.select_one(".ship-review__return-alert-meta")).replace("by ", ""),
                "reason": text_of(panel.select_one(".ship-review__return-alert-reason")),
            }
        elif panel_title == "Description":
            description = text_of(panel.select_one(".ship-review__description"))
        elif panel_title == "AI Declaration":
            ai_declaration = text_of(panel.select_one(".ship-review__description"))
            if not ai_declaration or "no ai declaration" in ai_declaration.lower():
                ai_declaration = ""
        elif panel_title == "Links":
            for dt, dd in zip(panel.select("dt"), panel.select("dd")):
                key = text_of(dt).lower()
                link = dd.select_one("a")
                links[key] = link.get("href") if link else text_of(dd)
        elif panel_title == "Submission":
            for dt, dd in zip(panel.select("dt"), panel.select("dd")):
                key = text_of(dt).lower().replace(" ", "_")
                submission_meta[key] = text_of(dd)

    # Claim / verdict form
    review_form = soup.select_one("form.review-form")
    can_review = review_form is not None
    claim = {"heldByMe": can_review, "expiresAt": None}

    if review_form:
        expiry = review_form.select_one("[data-expires-at]")
        claim["expiresAt"] = expiry.get("data-expires-at") if expiry else None
        claim["action"] = review_form.get("action")

        # Hidden fields
        for inp in review_form.select("input[type='hidden']"):
            name = inp.get("name")
            if name == "authenticity_token":
                claim["authenticityToken"] = inp.get("value")
            elif name == "_method":
                claim["method"] = inp.get("value")

    # Submitter history
    history = None
    hist_panel = soup.select_one(".submitter-history")
    if hist_panel:
        summary = text_of(hist_panel.select_one(".submitter-history__summary, .ship-review__description"))
        cards = []
        for card in hist_panel.select(".submitter-history__card"):
            cards.append({
                "id": parse_int(text_of(card.select_one(".submitter-history__card-id"))),
                "status": _status_from_pill(card.select_one(".status-pill")),
                "date": text_of(card.select_one(".submitter-history__card-date")),
                "title": text_of(card.select_one(".submitter-history__card-meta")),
                "feedback": text_of(card.select_one(".submitter-history__card-feedback")),
                "isCurrent": "submitter-history__card--current" in (card.get("class") or []),
            })
        history = {"summary": summary, "recent": cards}

    return {
        "id": cert_id,
        "projectTitle": title,
        "status": status,
        "momentum": momentum,
        "description": description,
        "aiDeclaration": ai_declaration,
        "links": links,
        "submissionMeta": submission_meta,
        "returnedAlert": returned_alert,
        "claim": claim,
        "submitterHistory": history,
    }


def parse_mystats() -> dict:
    soup = get("/admin/certification/ship/mystats")

    stats = {}
    for row in soup.select(".reviewer-stats__stats-row"):
        label = text_of(row.select_one(".reviewer-stats__stats-label")).lower().replace(":", "")
        value = text_of(row.select_one(".reviewer-stats__stats-value"))
        if label == "total":
            stats["total"] = parse_int(value) or 0
        elif label == "approved":
            stats["approved"] = parse_int(value) or 0
        elif label == "returned":
            stats["returned"] = parse_int(value) or 0
        elif label == "rate":
            stats["approvalRate"] = parse_int(value)

    unclaimed_text = text_of(soup.select_one(".reviewer-stats__balance-big"))
    stats["unclaimed"] = parse_int(unclaimed_text) or 0

    pending = soup.select_one(".reviewer-stats__payout-btn")
    stats["pendingPayout"] = text_of(pending) if pending and "pending" in text_of(pending).lower() else None

    history = []
    for row in soup.select(".reviewer-stats__table tbody tr"):
        cells = row.select("td")
        if len(cells) < 4:
            continue
        link = cells[0].select_one("a")
        item_id = parse_int(text_of(cells[0].select_one(".reviewer-stats__review-id")))
        status = _status_from_pill(cells[1].select_one(".status-pill"))
        amount_text = text_of(cells[2])
        amount = parse_int(amount_text) or 0
        is_payout = "-" in amount_text
        history.append({
            "id": item_id,
            "title": text_of(link) if link else text_of(cells[0]),
            "status": status,
            "amount": amount,
            "isPayout": is_payout,
            "date": text_of(cells[3]),
        })

    return {"stats": stats, "history": history}


def main():
    print("Fetching queue...")
    queue = parse_queue()
    (OUT / "queue.json").write_text(json.dumps(queue, indent=2))
    print(f"  Saved {len(queue['ships'])} ships")

    first_ship = queue["ships"][0]["id"] if queue["ships"] else None
    if first_ship:
        print(f"Fetching review detail for ship {first_ship}...")
        review = parse_review(first_ship)
        (OUT / "review.json").write_text(json.dumps(review, indent=2))
    else:
        print("No ships to fetch review for.")

    print("Fetching my stats...")
    mystats = parse_mystats()
    (OUT / "mystats.json").write_text(json.dumps(mystats, indent=2))
    print(f"  Saved stats with {len(mystats['history'])} history items")

    print(f"Fixtures written to {OUT}")


if __name__ == "__main__":
    main()
