"""FastAPI app for the Stardance Community Dash backend.

Run with:
    .venv/bin/uvicorn backend.app:app --reload --port 8000

Authentication is per-reviewer: the frontend sends an `Authorization: Bearer
<token>` header obtained from `POST /api/login`. Each reviewer pastes their own
`_stardance_session_v3` cookie (extracted from a curl command), and the backend
stores it keyed by their Slack id.
"""
from __future__ import annotations

import logging
import re
from contextlib import asynccontextmanager
from typing import Any, Optional

from bs4 import BeautifulSoup
from fastapi import Depends, FastAPI, HTTPException, Query, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import httpx
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from . import db
from . import github
from . import stardance
from .config import BASE, COOKIE_NAME, env, reviewer_api_key, reviewer_base_url
from .parsers import (
    absolutize,
    extract_review_id_from_url,
    parse_csrf,
    parse_mystats,
    parse_payout_modal,
    parse_project,
    parse_queue,
    parse_review,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("dash")


# ----- auth -----------------------------------------------------------------


AUTHORIZATION_HEADER = "Authorization"
BEARER_PREFIX = "Bearer "


class LoginPayload(BaseModel):
    cookie: str


class CookieCurlPayload(BaseModel):
    curl: str


def _extract_cookie(raw: str) -> str | None:
    """Pull `_stardance_session_v3` out of a raw cookie string or curl command."""
    # First try the curl -b / --cookie quoted block
    for flag in (r"-b\s+['\"]", r"--cookie\s+['\"]"):
        m = re.search(flag + r"(.*?)['\"]", raw, re.DOTALL)
        if m:
            raw = m.group(1)
            break
    # Now look for the cookie inside the string
    m = re.search(r"(?:^|;\s*)" + re.escape(COOKIE_NAME) + r"=([^;]+)", raw)
    if m:
        return m.group(1)
    # URL-encoded fallback if the whole string looks like a single cookie value
    if raw.strip() and not "=" in raw.strip():
        return raw.strip()
    return None


def _extract_cookie_from_header(cookie_header: str) -> str | None:
    m = re.search(r"(?:^|;\\s*)" + re.escape(COOKIE_NAME) + r"=([^;]+)", cookie_header)
    return m.group(1) if m else None


async def _session_from_cookie(cookie: str) -> stardance.ReviewerSession:
    """Validate a raw Stardance cookie and return a session (creating it if needed)."""
    session = db.load_reviewer_session_by_cookie(cookie)
    if session:
        return stardance.ReviewerSession(
            slack_user_id=session["slackUserId"],
            name=session["name"],
            cookie=session["cookie"],
            csrf_token=session.get("csrfToken"),
        )
    info = await _validate_cookie(cookie)
    reviewer = info["reviewer"]
    db.save_reviewer_session(
        reviewer["slackUserId"],
        reviewer["name"],
        cookie,
        info.get("csrfToken"),
    )
    return stardance.ReviewerSession(
        slack_user_id=reviewer["slackUserId"],
        name=reviewer["name"],
        cookie=cookie,
        csrf_token=info.get("csrfToken"),
    )


async def get_current_reviewer(request: Request) -> stardance.ReviewerSession:
    # 1) Prefer bearer tokens issued by the frontend login flow.
    auth = request.headers.get(AUTHORIZATION_HEADER, "")
    if auth.startswith(BEARER_PREFIX):
        token = auth[len(BEARER_PREFIX):].strip()
        slack_user_id = db.lookup_auth_token(token)
        if slack_user_id:
            session = db.load_reviewer_session(slack_user_id)
            if session:
                return stardance.ReviewerSession(
                    slack_user_id=session["slackUserId"],
                    name=session["name"],
                    cookie=session["cookie"],
                    csrf_token=session.get("csrfToken"),
                )

    # 2) Fall back to a raw Stardance session cookie. This lets the
    #    sw-reviewer service use the dash APIs with its own cookie without
    #    needing a frontend bearer token.
    cookie_header = request.headers.get("Cookie", "")
    cookie = _extract_cookie_from_header(cookie_header)
    if cookie:
        try:
            return await _session_from_cookie(cookie)
        except HTTPException:
            raise

    raise HTTPException(status_code=401, detail={"error": "unauthenticated", "message": "Missing or invalid auth"})


async def _validate_cookie(cookie: str) -> dict[str, Any]:
    """Fetch mystats with a cookie and return reviewer info + csrf token."""
    temp = stardance.ReviewerSession(
        slack_user_id="",
        name="Reviewer",
        cookie=cookie,
        csrf_token=None,
    )
    try:
        html = await stardance.client.get_path("/admin/certification/ship/mystats", session=temp)
    except stardance.SessionDead as exc:
        raise HTTPException(status_code=401, detail={"error": "session_dead", "message": str(exc)})
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)

    parsed = parse_mystats(html)
    reviewer = parsed.get("reviewer") or {"name": "Reviewer", "slackUserId": ""}
    if not reviewer.get("slackUserId"):
        raise HTTPException(status_code=401, detail={"error": "session_dead", "message": "Could not identify reviewer from session"})
    return {
        "reviewer": reviewer,
        "csrfToken": temp.csrf_token,
    }


# ----- lifespan / legacy migration ------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()

    # Bootstrap from a legacy single-row session table if it exists.
    legacy_cookie = db.load_legacy_session_cookie()
    if legacy_cookie and not db.list_reviewer_sessions():
        try:
            info = await _validate_cookie(legacy_cookie)
            reviewer = info["reviewer"]
            db.save_reviewer_session(
                reviewer["slackUserId"],
                reviewer["name"],
                legacy_cookie,
                info.get("csrfToken"),
            )
            db.drop_legacy_sessions()
            log.info("Migrated legacy session for %s", reviewer["name"])
        except Exception as exc:
            log.warning("Could not migrate legacy session: %s", exc)

    # Allow a fresh deploy to pre-warm one session from the env var.
    initial = env("STARDANCE_SESSION_COOKIE")
    if initial and not db.list_reviewer_sessions():
        try:
            info = await _validate_cookie(initial)
            reviewer = info["reviewer"]
            db.save_reviewer_session(
                reviewer["slackUserId"],
                reviewer["name"],
                initial,
                info.get("csrfToken"),
            )
            log.info("Pre-warmed session for %s", reviewer["name"])
        except Exception as exc:
            log.warning("Could not pre-warm session: %s", exc)

    yield
    await stardance.client.close()


app = FastAPI(title="Stardance Community Dash", version="0.2.0", lifespan=lifespan)

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


async def _fetch_all_queue_pages(session: stardance.ReviewerSession, base_params: list[str]) -> dict[str, Any]:
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
            html = await stardance.client.get_path(path, session=session)
        except stardance.StardanceError as exc:
            raise _wrap_upstream_error(exc)
        parsed = parse_queue(html)
        if page == 1:
            combined["stats"] = parsed["stats"]
            combined["leaderboards"] = parsed["leaderboards"]
            combined["status"] = parsed["status"]
            combined["sort"] = parsed["sort"]
        existing_ids = {s["id"] for s in combined["ships"]}
        for ship in parsed["ships"]:
            if ship["id"] not in existing_ids:
                combined["ships"].append(ship)
                existing_ids.add(ship["id"])
        if len(parsed["ships"]) < 25:
            break
        page += 1
        if page > 20:
            break
    return combined


def _follow_redirects(response) -> dict[str, Any]:
    """Pull the final `Location` from a redirect chain (up to 5 hops)."""
    if response.status_code not in (301, 302, 303, 307, 308):
        return {"status": response.status_code, "body": response.text, "location": ""}
    location = response.headers.get("location", "")
    flash = None
    if response.text:
        soup = BeautifulSoup(response.text, "html.parser")
        flash_el = soup.select_one(".flash, [data-role='flash'], .alert")
        if flash_el:
            flash = flash_el.get_text(strip=True)
    return {"status": response.status_code, "location": location, "flash": flash, "body": response.text}


# ----- auth endpoints -------------------------------------------------------


@app.post("/api/login")
async def post_login(payload: CookieCurlPayload) -> dict[str, Any]:
    cookie = _extract_cookie(payload.curl)
    if not cookie:
        raise HTTPException(status_code=400, detail={"error": "bad_request", "message": f"Could not find {COOKIE_NAME} in the pasted command"})

    info = await _validate_cookie(cookie)
    reviewer = info["reviewer"]
    db.save_reviewer_session(
        reviewer["slackUserId"],
        reviewer["name"],
        cookie,
        info.get("csrfToken"),
    )
    token = db.create_auth_token(reviewer["slackUserId"])
    return {"token": token, "reviewer": reviewer}


@app.post("/api/login-cookie")
async def post_login_cookie(payload: LoginPayload) -> dict[str, Any]:
    """Alternative login that accepts just the cookie value directly."""
    info = await _validate_cookie(payload.cookie)
    reviewer = info["reviewer"]
    db.save_reviewer_session(
        reviewer["slackUserId"],
        reviewer["name"],
        payload.cookie,
        info.get("csrfToken"),
    )
    token = db.create_auth_token(reviewer["slackUserId"])
    return {"token": token, "reviewer": reviewer}


@app.post("/api/logout")
async def post_logout(request: Request) -> dict[str, Any]:
    auth = request.headers.get(AUTHORIZATION_HEADER, "")
    slack_user_id: str | None = None
    if auth.startswith(BEARER_PREFIX):
        slack_user_id = db.lookup_auth_token(auth[len(BEARER_PREFIX):].strip())
        db.delete_auth_token(auth[len(BEARER_PREFIX):].strip())
    if slack_user_id:
        db.delete_reviewer_session(slack_user_id)
    return {"ok": True}


@app.get("/api/me")
async def get_me(session: stardance.ReviewerSession = Depends(get_current_reviewer)) -> dict[str, Any]:
    return {"name": session.name, "slackUserId": session.slack_user_id}


# ----- queue / review / claim / verdict / mystats -------------------------


@app.get("/api/queue")
async def get_queue(
    status: str = Query("pending", pattern="^(pending|approved|returned|all)$"),
    sort: str = Query("oldest", pattern="^(oldest|newest)$"),
    search: str | None = None,
    page: int = Query(0, ge=0),
    session: stardance.ReviewerSession = Depends(get_current_reviewer),
) -> dict[str, Any]:
    base_params = [f"status={status}", f"sort={sort}"]
    if search:
        base_params.append(f"search={search}")
    if page:
        base_params.append(f"page={page}")
        path = "/admin/certification/ship?" + "&".join(base_params)
        try:
            html = await stardance.client.get_path(path, session=session)
        except stardance.StardanceError as exc:
            raise _wrap_upstream_error(exc)
        return parse_queue(html) | {"status": status, "sort": sort, "page": page}
    combined = await _fetch_all_queue_pages(session, base_params)
    combined["status"] = status
    combined["sort"] = sort
    return combined


@app.get("/api/review/{cert_id}")
async def get_review(cert_id: int, session: stardance.ReviewerSession = Depends(get_current_reviewer)) -> dict[str, Any]:
    try:
        html = await stardance.client.get_path(f"/admin/certification/ship/{cert_id}", session=session)
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    parsed = parse_review(html, cert_id)

    project_path = parsed.get("links", {}).get("project")
    if project_path:
        project_id_match = re.search(r"/projects/(\d+)", project_path)
        if project_id_match:
            project_id = int(project_id_match.group(1))
            try:
                project_html = await stardance.client.get_path(project_path, session=session)
                project_data = parse_project(project_html)
                parsed["project"].update({
                    "projectId": project_data.get("projectId") or project_id,
                    "projectType": project_data.get("projectType") or parsed["project"].get("projectType", ""),
                    "screenshotUrl": project_data.get("screenshotUrl") or parsed["project"].get("screenshotUrl"),
                    "totalHours": project_data.get("totalHours"),
                    "stardanceUrl": absolutize(project_path),
                })
                parsed["totalHours"] = project_data.get("totalHours")
                parsed["devlogs"] = project_data.get("devlogs") or []
            except stardance.StardanceError:
                parsed["project"]["stardanceUrl"] = absolutize(project_path)

    db.cache_review(
        cert_id=cert_id,
        project_title=parsed.get("projectTitle") or "",
        owner=parsed.get("owner", {}).get("displayName", ""),
        payload=parsed,
    )
    parsed["notes"] = db.get_notes(cert_id)
    parsed["checklist"] = {"checkedItems": db.get_checklist(cert_id)}
    return parsed


@app.post("/api/review/{cert_id}/claim")
async def post_claim(cert_id: int, session: stardance.ReviewerSession = Depends(get_current_reviewer)) -> dict[str, Any]:
    try:
        resp = await stardance.client.post(
            f"/admin/certification/ship/{cert_id}/claim",
            session=session,
            fresh_token_from=f"/admin/certification/ship/{cert_id}",
        )
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    return _follow_redirects(resp)


@app.delete("/api/review/{cert_id}/claim")
async def delete_claim(cert_id: int, session: stardance.ReviewerSession = Depends(get_current_reviewer)) -> dict[str, Any]:
    try:
        resp = await stardance.client.delete(
            f"/admin/certification/ship/{cert_id}/claim",
            session=session,
            fresh_token_from=f"/admin/certification/ship/{cert_id}",
        )
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    return _follow_redirects(resp)


@app.get("/api/next")
async def get_next(skip: str | None = None, session: stardance.ReviewerSession = Depends(get_current_reviewer)) -> dict[str, Any]:
    path = "/admin/certification/ship/next"
    if skip:
        path += f"?skip={skip}"
    try:
        html = await stardance.client.get_path(path, session=session)
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    soup = BeautifulSoup(html, "html.parser")
    cert_match = re.search(r"/admin/certification/ship/(\d+)", str(soup))
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
    session: stardance.ReviewerSession = Depends(get_current_reviewer),
) -> dict[str, Any]:
    if status not in ("approved", "returned"):
        raise HTTPException(status_code=400, detail="status must be approved|returned")
    if len(feedback or "") > 10000:
        raise HTTPException(status_code=400, detail="feedback max 10000 chars")

    try:
        html = await stardance.client.get_path(f"/admin/certification/ship/{cert_id}", session=session)
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
            try:
                signed_id = await stardance.client.upload_video(
                    direct_upload_url,
                    video_bytes,
                    video.filename or "verdict.webm",
                    video.content_type or "video/webm",
                    session=session,
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
            session=session,
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
async def get_mystats(session: stardance.ReviewerSession = Depends(get_current_reviewer)) -> dict[str, Any]:
    try:
        html = await stardance.client.get_path("/admin/certification/ship/mystats", session=session)
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    parsed = parse_mystats(html)
    parsed["payoutModal"] = parse_payout_modal(html)
    if parsed.get("reviewer"):
        db.cache_reviewer(parsed["reviewer"])
    return parsed


class PayoutPayload(BaseModel):
    amount: int


@app.post("/api/mystats/payout")
async def post_payout(
    payload: PayoutPayload,
    session: stardance.ReviewerSession = Depends(get_current_reviewer),
) -> dict[str, Any]:
    try:
        resp = await stardance.client.post(
            "/admin/certification/ship/mystats/payout_request",
            session=session,
            data={"amount": str(payload.amount)},
            fresh_token_from="/admin/certification/ship/mystats",
        )
    except stardance.StardanceError as exc:
        raise _wrap_upstream_error(exc)
    return _follow_redirects(resp)


# ----- feedback templates / grammar fix -------------------------------------


@app.get("/api/feedback-templates")
async def get_feedback_templates() -> dict[str, Any]:
    return {"templates": db.get_feedback_templates()}


class FeedbackTemplatePayload(BaseModel):
    label: str
    body: str


@app.post("/api/feedback-templates")
async def post_feedback_template(payload: FeedbackTemplatePayload) -> dict[str, Any]:
    if not payload.label.strip() or not payload.body.strip():
        raise HTTPException(status_code=400, detail="label and body are required")
    template = db.save_feedback_template(payload.label.strip(), payload.body.strip())
    return {"ok": True, "template": template}


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
async def get_reviewer(session: stardance.ReviewerSession = Depends(get_current_reviewer)) -> dict[str, Any]:
    return {"name": session.name, "slackUserId": session.slack_user_id}


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
    sessions = db.list_reviewer_sessions()
    return {
        "ok": True,
        "authenticated_reviewers": len(sessions),
    }


@app.get("/api/cached-reviews")
async def cached_reviews() -> dict[str, Any]:
    return {"reviews": db.load_cached_reviews()}


# ----- sw-reviewer proxy ----------------------------------------------------


async def _proxy_to_reviewer(method: str, path: str) -> JSONResponse:
    key = reviewer_api_key()
    if not key:
        raise HTTPException(status_code=503, detail={"error": "reviewer_not_configured"})
    url = f"{reviewer_base_url()}{path}"
    headers = {"X-Reviewer-Key": key}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(method, url, headers=headers)
    try:
        body = resp.json()
    except Exception:
        body = {"ok": False, "raw": resp.text}
    return JSONResponse(body, status_code=resp.status_code)


@app.get("/api/reviews/{cert_id}/status")
async def get_review_status(
    cert_id: int,
    session: stardance.ReviewerSession = Depends(get_current_reviewer),
) -> JSONResponse:
    return await _proxy_to_reviewer("GET", f"/api/reviews/{cert_id}/status")


@app.post("/api/reviews/{cert_id}")
async def request_review(
    cert_id: int,
    session: stardance.ReviewerSession = Depends(get_current_reviewer),
) -> JSONResponse:
    return await _proxy_to_reviewer("POST", f"/api/reviews/{cert_id}")


@app.get("/api/reviews/{cert_id}/pdf")
async def get_review_pdf(
    cert_id: int,
    session: stardance.ReviewerSession = Depends(get_current_reviewer),
):
    key = reviewer_api_key()
    if not key:
        raise HTTPException(status_code=503, detail={"error": "reviewer_not_configured"})
    url = f"{reviewer_base_url()}/api/reviews/{cert_id}/pdf"
    headers = {"X-Reviewer-Key": key}

    async def _stream():
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("GET", url, headers=headers) as resp:
                async for chunk in resp.aiter_raw():
                    yield chunk

    return StreamingResponse(
        _stream(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="review_{cert_id}.pdf"'},
    )
