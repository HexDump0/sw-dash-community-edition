"""FastAPI app for the Stardance Community Dash backend.

Run with:
    .venv/bin/uvicorn backend.app:app --reload --port 8000

Reads the reviewer session cookie from $STARDANCE_SESSION_COOKIE on first
startup; from then on uses the rotated cookie persisted in SQLite.
"""
from __future__ import annotations

import logging
import re
from contextlib import asynccontextmanager
from typing import Any, Optional

from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Query, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from . import db
from . import github
from . import stardance
from .config import BASE
from .parsers import (
    parse_csrf,
    parse_mystats,
    parse_payout_modal,
    parse_queue,
    parse_review,
    extract_review_id_from_url,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("dash")


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    try:
        # Pre-warm the cookie from the env so a fresh deploy has a session
        # immediately, then any subsequent response will overwrite the
        # stored value with the rotated one.
        from .config import env
        initial = env("STARDANCE_SESSION_COOKIE")
        if initial and not db.load_session_cookie():
            db.save_session_cookie(initial)
    except Exception as exc:
        log.warning("Could not pre-warm session: %s", exc)
    yield
    await stardance.client.close()


app = FastAPI(title="Stardance Community Dash", version="0.1.0", lifespan=lifespan)

# CORS is not strictly needed because the frontend is served from the same
# Vite dev server and the Vite proxy handles routing, but it's nice to have
# for ad-hoc testing.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----- helpers --------------------------------------------------------------


def _wrap_upstream_error(exc: stardance.StardanceError) -> HTTPException:
    if isinstance(exc, stardance.SessionDead):
        return HTTPException(status_code=401, detail={"error": "session_dead", "message": str(exc)})
    return HTTPException(
        status_code=exc.status if exc.status >= 400 else 500,
        detail={"error": "upstream", "status": exc.status, "message": str(exc)},
    )


async def _fetch_all_queue_pages(base_params: list[str]) -> dict[str, Any]:
    """Fetch every page of the queue and merge into a single payload."""
    combined: dict[str, Any] = {
        "stats": {},
        "leaderboards": {"daily": [], "weekly": [], "alltime": []},
        "ships": [],
        "status": "pending",
        "sort": "oldest",
    }
    page = 1
    seen_pages: set[int] = set()
    while True:
        if page in seen_pages:
            break
        seen_pages.add(page)
        params = list(base_params) + [f"page={page}"]
        path = "/admin/certification/ship?" + "&".join(params)
        try:
            html = await stardance.client.get_path(path)
        except stardance.StardanceError as exc:
            raise _wrap_upstream_error(exc)
        parsed = parse_queue(html)
        if page == 1:
            combined["stats"] = parsed["stats"]
            combined["leaderboards"] = parsed["leaderboards"]
            combined["status"] = parsed["status"]
            combined["sort"] = parsed["sort"]
        # Skip duplicate ships (pagy sometimes repeats a row at the page
        # boundary when new items arrive)
        existing_ids = {s["id"] for s in combined["ships"]}
        for ship in parsed["ships"]:
            if ship["id"] not in existing_ids:
                combined["ships"].append(ship)
                existing_ids.add(ship["id"])
        if len(parsed["ships"]) < 25:
            break
        page += 1
        if page > 20:  # safety cap
            break
    return combined


def _follow_redirects(response) -> dict[str, Any]:
    """Pull the final `Location` from a redirect chain (up to 5 hops)."""
    if response.status_code not in (301, 302, 303, 307, 308):
        return {"status": response.status_code, "body": response.text, "location": ""}
    location = response.headers.get("location", "")
    # Parse flash from a redirect body if we landed on a page that has one
    flash = None
    if response.text:
        soup = BeautifulSoup(response.text, "html.parser")
        flash_el = soup.select_one(".flash, [data-role='flash'], .alert")
        if flash_el:
            flash = flash_el.get_text(strip=True)
    return {"status": response.status_code, "location": location, "flash": flash, "body": response.text}


# ----- queue / review / claim / verdict / mystats -------------------------


@app.get("/api/queue")
async def get_queue(
    status: str = Query("pending", pattern="^(pending|approved|returned|all)$"),
    sort: str = Query("oldest", pattern="^(oldest|newest)$"),
    search: str | None = None,
    page: int = Query(0, ge=0),
) -> dict[str, Any]:
    base_params = [f"status={status}", f"sort={sort}"]
    if search:
        base_params.append(f"search={search}")
    if page:
        # Explicit page requested: single page only
        base_params.append(f"page={page}")
        path = "/admin/certification/ship?" + "&".join(base_params)
        try:
            html = await stardance.client.get_path(path)
        except stardance.StardanceError as exc:
            raise _wrap_upstream_error(exc)
        return parse_queue(html) | {"status": status, "sort": sort, "page": page}
    # Default: fetch all pages and merge
    combined = await _fetch_all_queue_pages(base_params)
    combined["status"] = status
    combined["sort"] = sort
    return combined


@app.get("/api/review/{cert_id}")
async def get_review(cert_id: int) -> dict[str, Any]:
    try:
        html = await stardance.client.get_path(f"/admin/certification/ship/{cert_id}")
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    parsed = parse_review(html, cert_id)
    # Cache for later lookups (notes, checklist) and reviewer history
    db.cache_review(
        cert_id=cert_id,
        project_title=parsed.get("projectTitle") or "",
        owner=parsed.get("owner", {}).get("displayName", ""),
        payload=parsed,
    )
    # Attach locally-stored notes + checklist
    parsed["notes"] = db.get_notes(cert_id)
    parsed["checklist"] = {"checkedItems": db.get_checklist(cert_id)}
    return parsed


@app.post("/api/review/{cert_id}/claim")
async def post_claim(cert_id: int) -> dict[str, Any]:
    try:
        resp = await stardance.client.post(
            f"/admin/certification/ship/{cert_id}/claim",
            fresh_token_from=f"/admin/certification/ship/{cert_id}",
        )
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    return _follow_redirects(resp)


@app.delete("/api/review/{cert_id}/claim")
async def delete_claim(cert_id: int) -> dict[str, Any]:
    try:
        resp = await stardance.client.delete(
            f"/admin/certification/ship/{cert_id}/claim",
            fresh_token_from=f"/admin/certification/ship/{cert_id}",
        )
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    return _follow_redirects(resp)


@app.get("/api/next")
async def get_next(skip: str | None = None) -> dict[str, Any]:
    """Call Stardance's `/next` endpoint. Note: this is destructive — it
    releases all of the reviewer's other claims before claiming a new one.
    """
    path = "/admin/certification/ship/next"
    if skip:
        path += f"?skip={skip}"
    try:
        html = await stardance.client.get_path(path)
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    # The endpoint 302s to the show page; the body will contain the show
    # page. Extract the cert id from the response.
    soup = BeautifulSoup(html, "html.parser")
    cert_match = re.search(r"/admin/certification/ship/(\d+)", str(soup))
    # If we got an empty queue, the body has "Queue is empty."
    if "Queue is empty" in html:
        return {"empty": True, "certId": None}
    if not cert_match:
        raise HTTPException(status_code=502, detail="could not parse next response")
    return {"empty": False, "certId": int(cert_match.group(1))}


@app.patch("/api/review/{cert_id}")
async def patch_verdict(
    cert_id: int,
    status: str = Query(...),
    feedback: str = Query(""),
    video: UploadFile | None = File(None),
) -> dict[str, Any]:
    if status not in ("approved", "returned"):
        raise HTTPException(status_code=400, detail="status must be approved|returned")
    if len(feedback or "") > 10000:
        raise HTTPException(status_code=400, detail="feedback max 10000 chars")

    # Fetch the show page first so we have the form's direct-upload URL and
    # an up-to-date CSRF token.
    try:
        html = await stardance.client.get_path(f"/admin/certification/ship/{cert_id}")
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    parsed = parse_review(html, cert_id)
    direct_upload_url = parsed["claim"].get("directUploadUrl") or ""
    show_path = f"/admin/certification/ship/{cert_id}"

    data: dict[str, str] = {
        "certification_ship[status]": status,
        "certification_ship[feedback]": feedback or "",
    }

    files: dict[str, tuple[str, bytes, str]] | None = None
    if video:
        video_bytes = await video.read()
        if direct_upload_url:
            # Option B: direct upload to Stardance ActiveStorage
            try:
                signed_id = await stardance.client.upload_video(
                    direct_upload_url,
                    video_bytes,
                    video.filename or "verdict.webm",
                    video.content_type or "video/webm",
                )
            except stardance.StardanceError as exc:
                raise _wrap_upstream_error(exc)
            data["certification_ship[verdict_video]"] = signed_id
        else:
            files = {
                "certification_ship[verdict_video]": (
                    video.filename or "verdict.webm",
                    video_bytes,
                    video.content_type or "video/webm",
                )
            }

    try:
        resp = await stardance.client.patch(
            show_path,
            data=data,
            files=files,
            fresh_token_from=show_path,
        )
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)

    result = _follow_redirects(resp)
    if result.get("location"):
        next_id = extract_review_id_from_url(result["location"])
        if next_id:
            result["nextCertId"] = next_id
    return result


@app.get("/api/mystats")
async def get_mystats() -> dict[str, Any]:
    try:
        html = await stardance.client.get_path("/admin/certification/ship/mystats")
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    parsed = parse_mystats(html)
    parsed["payoutModal"] = parse_payout_modal(html)
    # Cache reviewer identity
    if parsed.get("reviewer"):
        db.cache_reviewer(parsed["reviewer"])
    return parsed


class PayoutPayload(BaseModel):
    amount: int


@app.post("/api/mystats/payout")
async def post_payout(payload: PayoutPayload) -> dict[str, Any]:
    try:
        resp = await stardance.client.post(
            "/admin/certification/ship/mystats/payout_request",
            data={"amount": str(payload.amount)},
            fresh_token_from="/admin/certification/ship/mystats",
        )
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    return _follow_redirects(resp)


# ----- notes / checklist / reviewer -----------------------------------------


@app.get("/api/notes/{cert_id}")
async def get_notes(cert_id: int) -> dict[str, str]:
    return db.get_notes(cert_id)


class NotesPayload(BaseModel):
    projectNote: str = ""
    userNote: str = ""


@app.put("/api/notes/{cert_id}")
async def put_notes(cert_id: int, payload: NotesPayload) -> dict[str, Any]:
    db.save_notes(cert_id, payload.projectNote, payload.userNote)
    return {"ok": True, "savedAt": db.get_notes(cert_id)}


@app.get("/api/checklist/{cert_id}")
async def get_checklist(cert_id: int) -> dict[str, list[int]]:
    return {"checkedItems": db.get_checklist(cert_id)}


class ChecklistPayload(BaseModel):
    checkedItems: list[int]


@app.put("/api/checklist/{cert_id}")
async def put_checklist(cert_id: int, payload: ChecklistPayload) -> dict[str, Any]:
    db.save_checklist(cert_id, payload.checkedItems)
    return {"ok": True, "checkedItems": db.get_checklist(cert_id)}


@app.get("/api/reviewer")
async def get_reviewer() -> dict[str, Any]:
    cached = db.load_reviewer()
    if cached:
        return cached
    # Otherwise fetch mystats once just to populate it
    try:
        html = await stardance.client.get_path("/admin/certification/ship/mystats")
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    parsed = parse_mystats(html)
    reviewer = parsed.get("reviewer") or {"name": "Reviewer", "slackUserId": ""}
    db.cache_reviewer(reviewer)
    return reviewer


# ----- github / readme ------------------------------------------------------


@app.get("/api/github")
async def github_endpoint(repoUrl: str | None = None) -> dict[str, Any]:
    if not repoUrl:
        raise HTTPException(status_code=400, detail="repoUrl required")
    data = await github.fetch_repo(repoUrl)
    if not data:
        raise HTTPException(status_code=404, detail="repo not found or github error")
    return data


@app.get("/api/readme")
async def readme_endpoint(url: str | None = None) -> dict[str, Any]:
    if not url:
        raise HTTPException(status_code=400, detail="url required")
    content = await github.fetch_readme(url)
    if not content:
        return {"content": ""}
    return {"content": content}


# ----- health / debug -------------------------------------------------------


@app.get("/api/health")
async def health() -> dict[str, Any]:
    cookie = db.load_session_cookie()
    return {
        "ok": True,
        "cookie_set": bool(cookie),
        "csrf_set": bool(db.load_csrf_token()),
    }


@app.get("/api/cached-reviews")
async def cached_reviews() -> dict[str, Any]:
    return {"reviews": db.load_cached_reviews()}
