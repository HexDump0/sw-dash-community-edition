#!/usr/bin/env python3
"""Enrich scraped Stardance fixtures with demo GitHub/checklist/user/notes data."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "fixtures"


def load(name: str):
    return json.load(open(ROOT / name))


def save(name: str, data):
    (ROOT / name).write_text(json.dumps(data, indent=2))


def parse_repo_owner_repo(repo_url: str):
    m = re.search(r"github\.com/([^/]+)/([^/]+?)(?:\.git)?/?$", repo_url)
    if m:
        return m.group(1), m.group(2)
    return "unknown", "repo"


def _parse_age_hours(age_text: str) -> int:
    age_text = age_text.lower()
    num = re.search(r"(\d+)\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months)", age_text)
    if not num:
        return 7 * 24
    n = int(num.group(1))
    unit = num.group(2)
    if "minute" in unit:
        return max(1, n // 60)
    if "hour" in unit:
        return n
    if "day" in unit:
        return n * 24
    if "week" in unit:
        return n * 24 * 7
    if "month" in unit:
        return n * 24 * 30
    return 7 * 24


def enrich_queue():
    q = load("queue.json")
    stats = q.setdefault("stats", {})
    net_flow = stats.get("net_flow", 0)
    if "decisions_today" not in stats or "new_today" not in stats:
        # Derive plausible demo values consistent with the net flow
        if net_flow >= 0:
            stats["decisions_today"] = 100 + net_flow
            stats["new_today"] = 100
        else:
            stats["decisions_today"] = 100
            stats["new_today"] = 100 - net_flow
    for ship in q["ships"]:
        ship.setdefault("screenshotUrl", None)
        ship.setdefault("waitingHours", _parse_age_hours(ship.get("ageText", "")))
    save("queue.json", q)


def enrich_review():
    r = load("review.json")
    owner_name = r.get("submissionMeta", {}).get("submitter", "Jarned")

    r["owner"] = {
        "displayName": owner_name,
        "slackUserId": "U0ABCDEF",
        "avatarUrl": None,
    }
    r["project"] = {
        "projectId": 5480,
        "title": r["projectTitle"],
        "description": r["description"],
        "projectType": "Hardware",
        "screenshotUrl": "https://placehold.co/800x450/343651/F4EBB9?text=Project+Screenshot",
        "playableUrl": r["links"].get("demo"),
        "repoUrl": r["links"].get("repo"),
        "readmeUrl": r["links"].get("readme"),
    }
    r["hackatimeHours"] = 12.5
    r["joeFraudPassed"] = None
    r["joeTrustScore"] = None

    # Timeline from submitter history
    from datetime import datetime, timedelta, timezone
    timeline = []
    now = datetime.now(timezone.utc)
    if r.get("submitterHistory"):
        for i, item in enumerate(r["submitterHistory"]["recent"]):
            # assign demo ISO dates spaced out backwards
            demo_date = (now - timedelta(days=i * 5 + 2)).isoformat()
            timeline.append({
                "id": item["id"],
                "title": item["title"],
                "status": item["status"],
                "date": demo_date,
                "reviewerName": "Amu" if i == 1 else "—",
                "feedback": item.get("feedback", ""),
            })
    r["timeline"] = timeline

    save("review.json", r)


def enrich_github():
    r = load("review.json")
    repo_url = r["links"].get("repo", "")
    owner, repo = parse_repo_owner_repo(repo_url)
    owner_name = r.get("submissionMeta", {}).get("submitter", "Author")

    data = {
        "repoUrl": repo_url,
        "fullName": f"{owner}/{repo}",
        "stars": 14,
        "forks": 3,
        "openIssues": 2,
        "pullRequests": 1,
        "language": "Rust",
        "license": "MIT",
        "createdAt": "2026-05-20T10:00:00Z",
        "pushedAt": "2026-06-15T08:30:00Z",
        "commits": [
            {
                "sha": "a1b2c3d",
                "message": "Initial commit: basic PCB layout",
                "author": owner_name,
                "date": "2026-05-20T10:00:00Z",
            },
            {
                "sha": "e4f5g6h",
                "message": "Add firmware and key mapping",
                "author": owner_name,
                "date": "2026-06-01T14:22:00Z",
            },
            {
                "sha": "i7j8k9l",
                "message": "Fix debounce and LED issues",
                "author": owner_name,
                "date": "2026-06-14T19:45:00Z",
            },
        ],
    }
    save("github.json", data)


def enrich_checklist():
    save("checklist.json", {"checkedItems": [0, 2, 5]})


def enrich_notes():
    save("notes.json", {"projectNote": "", "userNote": ""})


def enrich_reviewer():
    save("reviewer.json", {"name": "Reviewer", "slackUserId": "U0ABCDEF"})


def enrich_readme():
    r = load("review.json")
    readme_url = r["links"].get("readme")
    content = "# README\n\nNo README content available."
    if readme_url:
        try:
            import requests
            resp = requests.get(readme_url, timeout=15)
            if resp.status_code == 200:
                content = resp.text
        except Exception:
            pass
    save("readme.json", {"content": content})


def main():
    enrich_queue()
    enrich_review()
    enrich_github()
    enrich_checklist()
    enrich_notes()
    enrich_reviewer()
    enrich_readme()
    print("Fixtures enriched.")


if __name__ == "__main__":
    main()
