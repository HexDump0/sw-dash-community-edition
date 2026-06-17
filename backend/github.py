"""Lightweight GitHub REST API proxy.

The frontend's GitHub tab parses the repo URL from the project links and
hits this endpoint. We cache successful responses for 5 minutes keyed on
`<owner>/<repo>` to stay well below the 60 req/hr unauthenticated limit
and to handle missing/empty values gracefully.
"""
from __future__ import annotations

import re
import time
from typing import Any

import httpx

from .config import github_token
from .parsers import parse_repo_owner_repo

_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_CACHE_TTL = 300.0
_GITHUB_HEADERS_BASE = {
    "accept": "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "sw-dash-community",
}


def _headers() -> dict[str, str]:
    h = dict(_GITHUB_HEADERS_BASE)
    token = github_token()
    if token:
        h["authorization"] = f"Bearer {token}"
    return h


def _parse_repo_url(url: str | None) -> tuple[str, str] | None:
    if not url:
        return None
    owner, repo = parse_repo_owner_repo(url)
    if owner == "unknown":
        return None
    return owner, repo


def _normalize_commit(c: dict[str, Any]) -> dict[str, Any]:
    return {
        "sha": (c.get("sha") or "")[:7],
        "message": (c.get("commit", {}).get("message") or "").splitlines()[0] if c.get("commit") else "",
        "author": (
            c.get("commit", {}).get("author", {}).get("name")
            or c.get("author", {}).get("login")
            or "unknown"
        ),
        "date": c.get("commit", {}).get("author", {}).get("date") or "",
    }


async def fetch_repo(repo_url: str) -> dict[str, Any] | None:
    parsed = _parse_repo_url(repo_url)
    if not parsed:
        return None
    owner, repo = parsed
    key = f"{owner}/{repo}".lower()
    now = time.time()
    if key in _CACHE and now - _CACHE[key][0] < _CACHE_TTL:
        return _CACHE[key][1]

    async with httpx.AsyncClient(timeout=20.0) as gh:
        try:
            repo_resp = await gh.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers=_headers(),
            )
        except httpx.HTTPError:
            return None

        if repo_resp.status_code == 404:
            return None
        if repo_resp.status_code != 200:
            # Don't cache transient errors
            return None

        repo_data = repo_resp.json()
        license_info = repo_data.get("license") or {}
        license_name = license_info.get("spdx_id") if isinstance(license_info, dict) else None

        # Recent commits (max 10)
        commits: list[dict[str, Any]] = []
        try:
            commits_resp = await gh.get(
                f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=10",
                headers=_headers(),
            )
            if commits_resp.status_code == 200:
                commits = [_normalize_commit(c) for c in commits_resp.json()][:10]
        except httpx.HTTPError:
            pass

        # Pulls (open)
        pulls_count = 0
        try:
            pulls_resp = await gh.get(
                f"https://api.github.com/search/issues?q=repo:{owner}/{repo}+is:pr+is:open&per_page=1",
                headers=_headers(),
            )
            if pulls_resp.status_code == 200:
                pulls_count = pulls_resp.json().get("total_count", 0)
        except httpx.HTTPError:
            pass

        result = {
            "repoUrl": repo_url,
            "fullName": f"{owner}/{repo}",
            "stars": repo_data.get("stargazers_count", 0),
            "forks": repo_data.get("forks_count", 0),
            "openIssues": repo_data.get("open_issues_count", 0),
            "pullRequests": pulls_count,
            "language": repo_data.get("language"),
            "license": license_name,
            "createdAt": repo_data.get("created_at") or "",
            "pushedAt": repo_data.get("pushed_at") or "",
            "commits": commits,
        }
        _CACHE[key] = (now, result)
        return result


async def fetch_readme(readme_url: str) -> str | None:
    """Fetch a raw README through the gh-proxy (handles private repos)."""
    if not readme_url:
        return None
    # Convert github.com/<o>/<r>/blob/<ref>/<path> -> gh-proxy URL
    m = re.search(r"github\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)", readme_url)
    if not m:
        # Try raw.githubusercontent.com already
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            try:
                resp = await client.get(readme_url, headers={"user-agent": "sw-dash-community"})
                if resp.status_code == 200:
                    return resp.text
            except httpx.HTTPError:
                return None
        return None
    owner, repo, ref, path = m.groups()
    proxy_url = f"https://gh-proxy.hackclub.com/gh/raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}"
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
        try:
            resp = await client.get(proxy_url, headers={"user-agent": "sw-dash-community"})
            if resp.status_code == 200:
                return resp.text
        except httpx.HTTPError:
            return None
    return None
