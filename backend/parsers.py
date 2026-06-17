"""HTML parsers for Stardance shipwright pages.

Lifted from `scripts/fetch_fixtures.py` and extended to capture everything the
backend needs: the CSRF token from `meta[name=csrf-token]`, the verdict
form's direct-upload URL, return-alert blocks, submission meta, the
current reviewer's display name, and the "in queue" / "oldest waiting"
metrics. Helpers also extract links as full URLs and normalize status
text into the enum used by the frontend.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

BASE = "https://stardance.hackclub.com"


def parse_int(text: str | None) -> int | None:
    if not text:
        return None
    nums = re.findall(r"-?\d+", text.replace(",", ""))
    return int(nums[0]) if nums else None


def text_of(el) -> str:
    return el.get_text(strip=True) if el else ""


def status_from_pill(pill) -> str:
    if not pill:
        return "pending"
    classes = pill.get("class", [])
    for s in ["approved", "returned", "pending"]:
        if f"status-pill--{s}" in classes:
            return s
    return "pending"


def parse_csrf(html: str) -> str | None:
    soup = BeautifulSoup(html, "html.parser")
    meta = soup.select_one('meta[name="csrf-token"]')
    if meta and meta.get("content"):
        return meta["content"]
    return None


def age_hours_from_text(age_text: str) -> int | None:
    """Parse strings like "6 days old", "2 hours old", "1 minute old"."""
    if not age_text:
        return None
    m = re.search(r"(\d+)\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months)", age_text.lower())
    if not m:
        return None
    n = int(m.group(1))
    unit = m.group(2)
    if "minute" in unit:
        return max(0, n // 60)
    if "hour" in unit:
        return n
    if "day" in unit:
        return n * 24
    if "week" in unit:
        return n * 24 * 7
    if "month" in unit:
        return n * 24 * 30
    return None


def parse_repo_owner_repo(repo_url: str) -> tuple[str, str]:
    m = re.search(r"github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$", repo_url)
    if m:
        return m.group(1), m.group(2)
    return "unknown", "repo"


def _parse_claim_row(row) -> dict[str, Any]:
    title_el = row.select_one(".ship-queue__project-title")
    open_link = row.select_one(".ship-queue__cell-action a")
    href = open_link.get("href") if open_link else None
    ship_id = parse_int(href) if href else None

    claim_flag = row.select_one(".ship-queue__claim-flag")
    claim_state: str | None = None
    if claim_flag:
        classes = claim_flag.get("class", [])
        if "ship-queue__claim-flag--open" in classes:
            claim_state = "open"
        elif "ship-queue__claim-flag--locked" in classes:
            claim_state = "locked"

    status_pill = row.select_one(".status-pill")

    # The "by <name>" text is the first <span> inside .ship-queue__project-meta
    owner_span = row.select_one(".ship-queue__project-meta span")
    owner_name = text_of(owner_span).replace("by ", "").strip()

    # Find the age-text span ("6 days old", "2 hours old", ...)
    age_text = ""
    for span in row.select(".ship-queue__project-meta span"):
        t = text_of(span)
        if re.search(r"\b(minute|hour|day|week|month)", t, re.IGNORECASE):
            age_text = t
            break
    is_own = bool(row.select_one(".ship-queue__type-tag--own"))
    type_tag = row.select_one(".ship-queue__type-tag:not(.ship-queue__type-tag--own)")
    project_type = text_of(type_tag) if type_tag else ""

    countdown = row.select_one(".ship-queue__countdown")
    claim_expires = countdown.get("data-expires-at") if countdown else None

    return {
        "id": ship_id,
        "projectTitle": text_of(title_el),
        "projectShipIdLabel": text_of(row.select_one(".ship-queue__project-id")),
        "ownerDisplayName": owner_name,
        "ageText": age_text,
        "status": status_from_pill(status_pill),
        "hasBadReview": "bad review" in text_of(status_pill).lower(),
        "claimState": claim_state,
        "claimReviewerDisplayName": text_of(row.select_one(".ship-queue__claim-by")),
        "claimExpiresAt": claim_expires,
        "isOwnProject": is_own,
        "projectType": project_type,
        "screenshotUrl": None,
        "waitingHours": age_hours_from_text(age_text) or 0,
    }


def parse_queue(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    stats: dict[str, Any] = {
        "net_flow": 0,
        "net_positive": True,
        "pending": 0,
        "oldest_waiting_text": "",
        "oldest_waiting_id": None,
        "approval_rate": None,
        "decisions_this_week": 0,
        "overdue_pending": 0,
        "approved": 0,
        "returned": 0,
        "decided": 0,
        "decisions_today": 0,
        "new_today": 0,
    }

    net_el = soup.select_one(".ship-queue__net")
    if net_el:
        stats["net_flow"] = parse_int(net_el.get_text()) or 0
        stats["net_positive"] = "is-positive" in net_el.get("class", [])

    for m in soup.select(".ship-queue__metric"):
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

    # "decisions_today" / "new_today" aren't always on the page, but the
    # .ship-queue__progress header usually shows the net flow plus a
    # "<n> reviewed, <m> new" subtitle we can reuse.
    progress = soup.select_one(".ship-queue__progress")
    if progress:
        # Try to find a helper like "reviewed 103, received 116 new"
        for sub in progress.stripped_strings:
            m = re.search(r"reviewed\s+(\d+).*?(\d+)\s+new", sub, re.IGNORECASE)
            if m:
                stats["decisions_today"] = int(m.group(1))
                stats["new_today"] = int(m.group(2))
                break

    leaderboards: dict[str, list[dict[str, Any]]] = {"daily": [], "weekly": [], "alltime": []}
    for panel in soup.select(".ship-queue__ranks"):
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

    ships: list[dict[str, Any]] = []
    for row in soup.select(".ship-queue__table tbody tr"):
        parsed = _parse_claim_row(row)
        if parsed.get("id"):
            ships.append(parsed)

    return {
        "stats": stats,
        "leaderboards": leaderboards,
        "ships": ships,
        "status": "pending",
        "sort": "oldest",
    }


def parse_queue_pagination(html: str) -> dict[str, Any]:
    """Return next/prev page numbers if the queue is paginated."""
    soup = BeautifulSoup(html, "html.parser")
    info: dict[str, Any] = {"page": 1, "pages": 1, "has_next": False, "has_prev": False}
    for a in soup.select(".ship-queue__pagination a, .pagy a"):
        href = a.get("href", "")
        m = re.search(r"[?&]page=(\d+)", href)
        if m:
            n = int(m.group(1))
            if a.get("rel") == "next" or "next" in (a.get("aria-label") or "").lower():
                info["has_next"] = True
                info["pages"] = max(info["pages"], n)
            if a.get("rel") == "prev" or "prev" in (a.get("aria-label") or "").lower():
                info["has_prev"] = True
    return info


def parse_review(html: str, cert_id: int) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    title = text_of(soup.select_one(".ship-review__title h1"))
    status = status_from_pill(soup.select_one(".ship-review__title .status-pill"))
    parsed_cert_id = parse_int(text_of(soup.select_one(".ship-review__id"))) or cert_id

    momentum: dict[str, Any] = {}
    momentum_count = soup.select_one(".ship-review__momentum-count")
    if momentum_count:
        momentum["count"] = parse_int(text_of(momentum_count)) or 0
    momentum["label"] = text_of(soup.select_one(".ship-review__momentum-label"))

    description = ""
    ai_declaration = ""
    links: dict[str, str] = {}
    submission_meta: dict[str, str] = {}
    returned_alert: dict[str, Any] | None = None

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
                a = dd.select_one("a")
                links[key] = a.get("href") if a else text_of(dd)
        elif panel_title == "Submission":
            for dt, dd in zip(panel.select("dt"), panel.select("dd")):
                key = text_of(dt).lower().replace(" ", "_")
                submission_meta[key] = text_of(dd)

    # Claim / verdict form
    review_form = soup.select_one("form.review-form")
    can_review = review_form is not None
    claim: dict[str, Any] = {
        "heldByMe": can_review,
        "expiresAt": None,
        "action": "",
        "method": "",
        "authenticityToken": "",
        "directUploadUrl": "",
    }
    if review_form:
        expiry = review_form.select_one("[data-expires-at]")
        if expiry:
            claim["expiresAt"] = expiry.get("data-expires-at")
        claim["action"] = review_form.get("action", "")
        claim["directUploadUrl"] = review_form.get(
            "data-certification--video-drop-direct-upload-url-value", ""
        )
        for inp in review_form.select("input[type='hidden']"):
            name = inp.get("name")
            if name == "authenticity_token":
                claim["authenticityToken"] = inp.get("value", "")
            elif name == "_method":
                claim["method"] = inp.get("value", "")

    # Unclaim form
    unclaim_form = soup.select_one('form[action$="/claim"][method="post"]')
    unclaim_action: str | None = None
    unclaim_token: str | None = None
    if unclaim_form:
        unclaim_action = unclaim_form.get("action")
        for inp in unclaim_form.select("input[type='hidden']"):
            if inp.get("name") == "authenticity_token":
                unclaim_token = inp.get("value")
    claim["unclaimAction"] = unclaim_action or ""
    claim["unclaimToken"] = unclaim_token or ""

    submitter_history: dict[str, Any] | None = None
    hist_panel = soup.select_one(".submitter-history")
    if hist_panel:
        summary = text_of(hist_panel.select_one(".submitter-history__summary, .ship-review__description"))
        cards: list[dict[str, Any]] = []
        for card in hist_panel.select(".submitter-history__card"):
            cards.append({
                "id": parse_int(text_of(card.select_one(".submitter-history__card-id"))),
                "status": status_from_pill(card.select_one(".status-pill")),
                "date": text_of(card.select_one(".submitter-history__card-date")),
                "title": text_of(card.select_one(".submitter-history__card-meta")),
                "feedback": text_of(card.select_one(".submitter-history__card-feedback")),
                "isCurrent": "submitter-history__card--current" in (card.get("class") or []),
            })
        submitter_history = {"summary": summary, "recent": cards}

    # Build a timeline the frontend can render from the submitter history panel.
    timeline: list[dict[str, Any]] = []
    if submitter_history:
        for card in submitter_history.get("recent", []):
            meta = (card.get("title") or "").replace("\n", "·")
            parts = [p.strip() for p in meta.split("·") if p.strip()]
            project_title = parts[0] if parts else (card.get("title") or "")
            reviewer_name = ""
            if len(parts) > 1 and parts[-1].lower().startswith("by "):
                reviewer_name = parts[-1][3:].strip()
            raw_date = card.get("date") or ""
            iso_date = ""
            if raw_date and raw_date != "—":
                try:
                    dt = datetime.strptime(f"{raw_date} {datetime.now().year}", "%b %d %Y")
                    if dt.date() > datetime.now().date():
                        dt = dt.replace(year=dt.year - 1)
                    iso_date = dt.date().isoformat()
                except ValueError:
                    iso_date = raw_date
            timeline.append({
                "id": card.get("id") or 0,
                "title": project_title,
                "status": card.get("status") or "pending",
                "date": iso_date,
                "reviewerName": reviewer_name,
                "feedback": card.get("feedback") or "",
            })

    # Best-effort submission meta
    submitter = submission_meta.get("submitter", "")
    project_type = submission_meta.get("project_type", "")

    return {
        "id": parsed_cert_id,
        "projectTitle": title,
        "status": status,
        "momentum": momentum,
        "description": description,
        "aiDeclaration": ai_declaration,
        "links": links,
        "submissionMeta": submission_meta,
        "returnedAlert": returned_alert,
        "claim": claim,
        "submitterHistory": submitter_history,
        "owner": {
            "displayName": submitter,
            "slackUserId": "",
            "avatarUrl": None,
        },
        "project": {
            "projectId": 0,
            "title": title,
            "description": description,
            "projectType": project_type,
            "screenshotUrl": None,
            "playableUrl": links.get("demo"),
            "repoUrl": links.get("repo"),
            "readmeUrl": links.get("readme"),
            "stardanceUrl": None,
            "totalHours": None,
        },
        "hackatimeHours": None,
        "totalHours": None,
        "joeFraudPassed": None,
        "joeTrustScore": None,
        "timeline": timeline,
        "devlogs": [],
    }


def parse_mystats(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    stats: dict[str, Any] = {
        "total": 0,
        "approved": 0,
        "returned": 0,
        "approvalRate": None,
        "unclaimed": 0,
        "pendingPayout": None,
    }

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
    if pending and "pending" in text_of(pending).lower():
        stats["pendingPayout"] = text_of(pending)

    # Payout modal hidden amount min
    hint = soup.select_one(".reviewer-stats__modal-hint")
    if hint:
        m = re.search(r"Unclaimed:\s*(\d+)", hint.get_text())
        if m:
            stats["unclaimed"] = int(m.group(1))

    history: list[dict[str, Any]] = []
    for row in soup.select(".reviewer-stats__table tbody tr"):
        cells = row.select("td")
        if len(cells) < 4:
            continue
        link = cells[0].select_one("a")
        item_id = parse_int(text_of(cells[0].select_one(".reviewer-stats__review-id")))
        status = status_from_pill(cells[1].select_one(".status-pill"))
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

    # Reviewer display name + slack id from the sidebar nav
    reviewer_name = "Reviewer"
    slack_user_id = ""
    for a in soup.select('a[href^="/@"]'):
        t = text_of(a)
        if t.startswith("@"):
            reviewer_name = t.lstrip("@")
            break
    if reviewer_name == "Reviewer":
        for a in soup.select("nav a"):
            t = text_of(a)
            if t.startswith("@"):
                reviewer_name = t.lstrip("@")
                break

    # Slack id from the reviewer's Cachet avatar URL
    for img in soup.find_all("img", src=re.compile(r"cachet\.hackclub\.com/users/([^/]+)/r")):
        m = re.search(r"cachet\.hackclub\.com/users/([^/]+)/r", img.get("src", ""))
        if m:
            slack_user_id = m.group(1)
            break

    return {
        "stats": stats,
        "history": history,
        "reviewer": {"name": reviewer_name, "slackUserId": slack_user_id},
    }


def parse_payout_modal(html: str) -> dict[str, Any]:
    """Pull minimum amount and unclaimed balance from the payout modal."""
    soup = BeautifulSoup(html, "html.parser")
    info: dict[str, Any] = {"minimum": 10, "unclaimed": 0}
    hint = soup.select_one(".reviewer-stats__modal-hint")
    if hint:
        m = re.search(r"Minimum:\s*(\d+).*?Unclaimed:\s*(\d+)", hint.get_text())
        if m:
            info["minimum"] = int(m.group(1))
            info["unclaimed"] = int(m.group(2))
    return info


def parse_flash(html: str) -> str | None:
    """Return the first flash message in the response (Stardance uses
    `shared/flash` partial)."""
    soup = BeautifulSoup(html, "html.parser")
    flash = soup.select_one(".flash, [data-role='flash']")
    if flash:
        return text_of(flash)
    # Some pages just embed flash text inside `.status-pill--<status>` siblings.
    return None


def extract_review_id_from_url(url: str) -> int | None:
    m = re.search(r"/admin/certification/ship/(\d+)", url)
    return int(m.group(1)) if m else None


def _duration_to_seconds(duration_text: str) -> int:
    """Convert strings like '40m 10s', '2h 30m', '1h' to seconds."""
    total = 0
    for m in re.finditer(r"(\d+)\s*(h|m|s)", duration_text.lower()):
        n = int(m.group(1))
        unit = m.group(2)
        if unit == "h":
            total += n * 3600
        elif unit == "m":
            total += n * 60
        else:
            total += n
    return total


def _parse_relative_date(date_text: str) -> str:
    """Best-effort ISO fallback for 'about 2 hours ago' style text."""
    # We can't reliably convert relative text to an exact ISO date without a
    # reference, so return the raw text as a placeholder. The frontend formats
    # it as-is if parsing fails.
    return date_text.strip("· ").strip() or ""


def parse_project(html: str) -> dict[str, Any]:
    """Parse a public `/projects/:id` page for richer review context."""
    soup = BeautifulSoup(html, "html.parser")

    # Canonical project id from the latest-ship article
    article = soup.select_one("article.project-show__latest-ship")
    project_id = None
    if article:
        project_id = parse_int(article.get("data-feed-engagement-project-id-value"))

    title = text_of(soup.select_one(".project-show__title"))
    description = text_of(soup.select_one(".project-show__summary"))

    # Mission / category as a proxy for project type
    mission = text_of(soup.select_one(".project-show__latest-ship-mission-link, .mission-panel__title"))

    # Screenshot / banner: prefer the dedicated banner, then the latest-ship
    # media, then any panel image. Avoid cachet avatars.
    screenshot = None
    banner = soup.select_one(".project-show__banner-image")
    if banner and banner.get("src"):
        screenshot = banner["src"]
    if not screenshot:
        latest_ship = soup.select_one("article.project-show__latest-ship")
        if latest_ship:
            for img in latest_ship.select(".feed-post-card__image, .feed-post-card__media img"):
                if img.get("src"):
                    screenshot = img["src"]
                    break
    if not screenshot:
        for img in soup.select(".project-show__panel img"):
            if img.get("src") and "cachet" not in img["src"]:
                screenshot = img["src"]
                break

    # Stats: total hours and devlog count
    stats: dict[str, int] = {}
    for item in soup.select(".project-show__stats-item"):
        num_el = item.select_one(".project-show__stats-num")
        label_el = item.select_one(".project-show__stats-label")
        if num_el and label_el:
            key = text_of(label_el).lower()
            stats[key] = parse_int(text_of(num_el)) or 0

    total_hours = stats.get("total hours")

    # Devlogs: feed cards excluding the latest ship and comment-modal clones
    devlogs: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for card in soup.select(".feed-post-card"):
        if "project-show__latest-ship" in (card.get("class") or []):
            continue
        if card.find_parent(class_="comment-modal"):
            continue

        # Use the card text as a stable id since no reliable id attr exists
        body_el = card.select_one(".feed-post-card__body.markdown-content")
        body = text_of(body_el)
        if not body:
            continue
        card_id = body[:80]
        if card_id in seen_ids:
            continue
        seen_ids.add(card_id)

        duration_text = text_of(card.select_one(".feed-post-card__duration"))
        time_text = text_of(card.select_one(".feed-post-card__time"))
        title_text = text_of(card.select_one(".feed-post-card__title")) or "Devlog"

        devlogs.append({
            "id": len(devlogs) + 1,
            "title": title_text,
            "body": body,
            "durationSeconds": _duration_to_seconds(duration_text),
            "createdAt": _parse_relative_date(time_text),
        })

    return {
        "projectId": project_id,
        "title": title,
        "description": description,
        "projectType": mission,
        "screenshotUrl": screenshot,
        "totalHours": total_hours,
        "devlogs": devlogs,
    }


def absolutize(url: str | None) -> str | None:
    if not url:
        return url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return urljoin(BASE, url)
