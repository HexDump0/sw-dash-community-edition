"""Async HTTP client for Stardance.

The client is now stateless regarding cookies. Each call receives a
``ReviewerSession`` containing the reviewer's cookie and optional CSRF token.
The client only updates the CSRF token in that session object; it does not
rotate or persist session cookies, since Stardance cookies remain valid across
requests.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from .config import BASE, COOKIE_NAME

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


@dataclass
class ReviewerSession:
    """Session context for a single reviewer."""

    slack_user_id: str
    name: str
    cookie: str
    csrf_token: str | None = None
    cookies: dict[str, str] = field(init=False)

    def __post_init__(self) -> None:
        self.cookies = {COOKIE_NAME: self.cookie}


class Client:
    """One process-wide async client. Reuses connection pool; no global cookie."""

    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None
        self._lock = asyncio.Lock()

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=BASE,
                headers=COMMON_HEADERS,
                follow_redirects=False,
                timeout=httpx.Timeout(30.0, connect=10.0),
            )
            self._client.cookies.clear()
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        path: str,
        *,
        session: ReviewerSession,
        **kwargs: Any,
    ) -> httpx.Response:
        """Make a request with the reviewer's cookies and clear the jar afterwards."""
        client = await self._ensure_client()
        client.cookies.clear()
        try:
            return await client.request(method, path, cookies=session.cookies, **kwargs)
        finally:
            client.cookies.clear()

    def _scrape_csrf(self, html: str, session: ReviewerSession) -> str | None:
        soup = BeautifulSoup(html, "html.parser")
        meta = soup.select_one('meta[name="csrf-token"]')
        if meta and meta.get("content"):
            token = meta["content"]
            session.csrf_token = token
            return token
        return None

    async def get_html(
        self,
        path: str,
        *,
        session: ReviewerSession,
        referer: str | None = None,
    ) -> tuple[str, str, dict[str, str]]:
        """GET a Stardance HTML page. Returns (final_url, body, headers).

        Raises `SessionDead` on a 302 to `/`.
        """
        headers = dict(COMMON_HEADERS)
        if referer:
            headers["referer"] = referer
        resp = await self._request("GET", path, session=session, headers=headers)

        if resp.status_code in (301, 302, 303, 307, 308):
            location = resp.headers.get("location", "")
            if location.startswith("/") or location.startswith(BASE):
                if location.rstrip("/") in ("", "/"):
                    raise SessionDead(302, "redirected to /", resp.text)
                return location, "", {"location": location}
            raise StardanceError(resp.status_code, f"unexpected redirect to {location}", resp.text)

        if resp.status_code in (401, 403):
            raise StardanceError(resp.status_code, "forbidden", resp.text)
        if resp.status_code == 404:
            raise StardanceError(resp.status_code, "not found", resp.text)

        if resp.status_code != 200:
            raise StardanceError(resp.status_code, "upstream error", resp.text)

        self._scrape_csrf(resp.text, session)
        return str(resp.url), resp.text, dict(resp.headers)

    async def get_path(self, path: str, *, session: ReviewerSession, referer: str | None = None) -> str:
        """Just fetch HTML, return body. Raises on non-200."""
        url, body, _ = await self.get_html(path, session=session, referer=referer)
        return body

    async def _do_mutate(
        self,
        method: str,
        path: str,
        *,
        session: ReviewerSession,
        data: dict[str, str] | None = None,
        files: dict[str, tuple[str, bytes, str]] | None = None,
        fresh_token_from: str | None = None,
        _retried: bool = False,
    ) -> httpx.Response:
        headers = dict(COMMON_HEADERS)

        refresh_path = fresh_token_from or path
        try:
            await self.get_html(refresh_path, session=session)
        except StardanceError:
            pass

        token = session.csrf_token
        if token:
            headers["x-csrf-token"] = token
        headers["referer"] = urljoin(BASE, refresh_path)

        resp = await self._request(method, path, session=session, data=data, files=files, headers=headers)

        if resp.status_code in (301, 302, 303, 307, 308):
            return resp

        if resp.status_code == 422 and not _retried and "InvalidAuthenticityToken" in resp.text:
            log.warning("CSRF mismatch, retrying with fresh token")
            try:
                await self.get_html(refresh_path, session=session)
            except StardanceError:
                pass
            return await self._do_mutate(
                method,
                path,
                session=session,
                data=data,
                files=files,
                fresh_token_from=fresh_token_from,
                _retried=True,
            )

        if resp.status_code in (401, 403):
            raise StardanceError(resp.status_code, "forbidden", resp.text)

        return resp

    async def post(
        self,
        path: str,
        *,
        session: ReviewerSession,
        data: dict[str, str] | None = None,
        files: dict[str, tuple[str, bytes, str]] | None = None,
        fresh_token_from: str | None = None,
    ) -> httpx.Response:
        return await self._do_mutate("POST", path, session=session, data=data, files=files, fresh_token_from=fresh_token_from)

    async def patch(
        self,
        path: str,
        *,
        session: ReviewerSession,
        data: dict[str, str] | None = None,
        files: dict[str, tuple[str, bytes, str]] | None = None,
        fresh_token_from: str | None = None,
    ) -> httpx.Response:
        return await self._do_mutate("PATCH", path, session=session, data=data, files=files, fresh_token_from=fresh_token_from)

    async def delete(
        self,
        path: str,
        *,
        session: ReviewerSession,
        fresh_token_from: str | None = None,
    ) -> httpx.Response:
        return await self._do_mutate("DELETE", path, session=session, fresh_token_from=fresh_token_from)

    async def upload_video(
        self,
        upload_url: str,
        video: bytes,
        filename: str,
        content_type: str,
        *,
        session: ReviewerSession,
    ) -> str:
        """PUT the video to ActiveStorage direct_uploads and return the signed_id."""
        token = session.csrf_token
        headers = {
            "accept": "application/json",
            "content-type": content_type,
            "user-agent": USER_AGENT,
        }
        if token:
            headers["x-csrf-token"] = token
        headers["content-disposition"] = f'attachment; filename="{filename}"'

        target = upload_url
        if target.startswith("/"):
            target = urljoin(BASE, target)

        resp = await self._request("PUT", target, session=session, content=video, headers=headers)
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
