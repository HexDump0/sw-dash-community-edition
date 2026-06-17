"""Async HTTP client for Stardance that:

* carries the reviewer session cookie,
* captures the rotated `_stardance_session_v3` value from every response
  and persists it to SQLite so other processes / restarts keep working,
* scrapes the CSRF token from the latest HTML page when needed and stores
  it alongside the cookie,
* retries once on `InvalidAuthenticityToken` (re-GET for a fresh token),
* follows redirects up to 5 hops and reports the final URL so callers
  can detect flash / success states.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from . import db
from .config import BASE, COOKIE_NAME, session_cookie

log = logging.getLogger("stardance")

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
)
COMMON_HEADERS = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    "user-agent": USER_AGENT,
    "sec-ch-ua": '"Chromium";v="147", "Not.A/Brand";v="8"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Linux"',
    "upgrade-insecure-requests": "1",
}


class StardanceError(Exception):
    """Raised for upstream HTTP errors that the caller should surface."""

    def __init__(self, status: int, message: str, body: str = "") -> None:
        super().__init__(f"{status} {message}")
        self.status = status
        self.message = message
        self.body = body


class SessionDead(StardanceError):
    """Raised when Stardance redirects us to /, signalling a dead session."""


class Client:
    """One process-wide async client. Reuses connection pool + cookie jar."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._lock = asyncio.Lock()

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            cookie_value = session_cookie()
            cookies = {COOKIE_NAME: cookie_value}
            self._client = httpx.AsyncClient(
                base_url=BASE,
                cookies=cookies,
                headers=COMMON_HEADERS,
                follow_redirects=False,
                timeout=httpx.Timeout(30.0, connect=10.0),
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    def _update_cookie(self, response: httpx.Response) -> None:
        """Pull the rotated cookie out of `Set-Cookie` and persist it."""
        for raw in response.headers.get_list("set-cookie"):
            # Case-insensitive lookup for the cookie name
            for part in raw.split(";"):
                part = part.strip()
                if "=" in part:
                    name, _, value = part.partition("=")
                    if name.strip().lower() == COOKIE_NAME:
                        if value:
                            db.save_session_cookie(value)
                            if self._client:
                                self._client.cookies.set(COOKIE_NAME, value, domain="stardance.hackclub.com")
                        return

    def _scrape_csrf(self, html: str) -> str | None:
        soup = BeautifulSoup(html, "html.parser")
        meta = soup.select_one('meta[name="csrf-token"]')
        if meta and meta.get("content"):
            token = meta["content"]
            db.save_csrf_token(token)
            return token
        return None

    async def get_html(self, path: str, *, referer: str | None = None, _retried: bool = False) -> tuple[str, str, dict[str, str]]:
        """GET a Stardance HTML page. Returns (final_url, body, cookies_captured).

        Raises `SessionDead` on a 302 to `/`.
        """
        client = await self._ensure_client()
        headers = dict(COMMON_HEADERS)
        if referer:
            headers["referer"] = referer
        resp = await client.get(path, headers=headers)

        if resp.status_code in (301, 302, 303, 307, 308):
            location = resp.headers.get("location", "")
            if location.startswith("/") or location.startswith(BASE):
                # follow one hop; we only care about `/` or auth bounces
                if location.rstrip("/") in ("", "/"):
                    raise SessionDead(302, "redirected to /", resp.text)
                # Otherwise just record the redirect target
                self._update_cookie(resp)
                return location, "", {"location": location}
            raise StardanceError(resp.status_code, f"unexpected redirect to {location}", resp.text)

        if resp.status_code == 401 or resp.status_code == 403:
            raise StardanceError(resp.status_code, "forbidden", resp.text)
        if resp.status_code == 404:
            raise StardanceError(resp.status_code, "not found", resp.text)

        if resp.status_code != 200:
            raise StardanceError(resp.status_code, "upstream error", resp.text)

        self._update_cookie(resp)
        self._scrape_csrf(resp.text)
        return str(resp.url), resp.text, dict(resp.headers)

    async def get_path(self, path: str, *, referer: str | None = None) -> str:
        """Just fetch HTML, return body. Raises on non-200."""
        url, body, _ = await self.get_html(path, referer=referer)
        return body

    async def _do_mutate(
        self,
        method: str,
        path: str,
        *,
        data: dict[str, str] | None = None,
        files: dict[str, tuple[str, bytes, str]] | None = None,
        fresh_token_from: str | None = None,
        _retried: bool = False,
    ) -> httpx.Response:
        client = await self._ensure_client()
        headers = dict(COMMON_HEADERS)

        # Refresh the CSRF token from a representative HTML page so the
        # token lines up with the rotated cookie. For ship cert actions we
        # use the cert's show page; for mystats we use the mystats page.
        refresh_path = fresh_token_from or path
        try:
            await self.get_html(refresh_path)
        except StardanceError:
            pass  # best-effort; might already have a valid token

        token = db.load_csrf_token()
        if token:
            headers["x-csrf-token"] = token
        headers["referer"] = urljoin(BASE, refresh_path)

        resp = await client.request(method, path, data=data, files=files, headers=headers)
        self._update_cookie(resp)

        if resp.status_code in (301, 302, 303, 307, 308):
            return resp

        if resp.status_code == 422 and not _retried and "InvalidAuthenticityToken" in resp.text:
            log.warning("CSRF mismatch, retrying with fresh token")
            try:
                await self.get_html(refresh_path)
            except StardanceError:
                pass
            return await self._do_mutate(
                method,
                path,
                data=data,
                files=files,
                fresh_token_from=fresh_token_from,
                _retried=True,
            )

        if resp.status_code in (401, 403):
            raise StardanceError(resp.status_code, "forbidden", resp.text)

        return resp

    async def post(self, path: str, *, data: dict[str, str] | None = None, files: dict[str, tuple[str, bytes, str]] | None = None, fresh_token_from: str | None = None) -> httpx.Response:
        return await self._do_mutate("POST", path, data=data, files=files, fresh_token_from=fresh_token_from)

    async def patch(self, path: str, *, data: dict[str, str] | None = None, files: dict[str, tuple[str, bytes, str]] | None = None, fresh_token_from: str | None = None) -> httpx.Response:
        return await self._do_mutate("PATCH", path, data=data, files=files, fresh_token_from=fresh_token_from)

    async def delete(self, path: str, *, fresh_token_from: str | None = None) -> httpx.Response:
        return await self._do_mutate("DELETE", path, fresh_token_from=fresh_token_from)

    async def upload_video(self, upload_url: str, video: bytes, filename: str, content_type: str) -> str:
        """Option B: PUT the video to ActiveStorage direct_uploads and return
        the `signed_id` we can attach to the verdict form.
        """
        client = await self._ensure_client()
        token = db.load_csrf_token()
        headers = {
            "accept": "application/json",
            "content-type": content_type,
            "user-agent": USER_AGENT,
        }
        if token:
            headers["x-csrf-token"] = token
        # The direct_uploads endpoint expects a Content-Type matching the
        # blob's content type and the body to be the raw bytes. Filename is
        # passed via the `Content-Disposition: attachment; filename=...`
        # header (Rails reads it server-side).
        headers["content-disposition"] = f'attachment; filename="{filename}"'

        # Build the absolute URL — upload_url may be relative
        target = upload_url
        if target.startswith("/"):
            target = urljoin(BASE, target)

        resp = await client.put(target, content=video, headers=headers)
        self._update_cookie(resp)
        if resp.status_code not in (200, 201):
            raise StardanceError(resp.status_code, "video upload failed", resp.text)
        try:
            payload = resp.json()
        except Exception as exc:
            raise StardanceError(resp.status_code, f"video upload non-JSON response: {exc}", resp.text)
        signed_id = payload.get("signed_id")
        if not signed_id:
            raise StardanceError(resp.status_code, "video upload missing signed_id", resp.text)
        return signed_id


client = Client()
