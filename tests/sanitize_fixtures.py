#!/usr/bin/env python3
"""Scrub session-scoped secrets from captured Stardance HTML fixtures.

CSRF tokens, form authenticity tokens, and Slack user ids are session/user
specific and must never be committed. This rewrites them to stable placeholders
so the parser regression fixtures are safe to check in.

Usage:
    python tests/sanitize_fixtures.py tests/fixtures/*.html

The sanitization is idempotent and structure-preserving: it only swaps token
*values*, never the surrounding markup the parser depends on.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# `content="..."` on the csrf meta tag.
CSRF_META = re.compile(r'(csrf-token"\s+content=")[^"]*(")')
# `<input name="authenticity_token" value="..." />` style hidden fields.
AUTH_TOKEN = re.compile(r'(authenticity_token"\s+value=")[^"]*(")')
# Slack user ids like U084UQFF0LC (uppercase U + 10 base32-ish chars), as seen
# in cachet avatar URLs and elsewhere.
SLACK_ID = re.compile(r"U[0-9A-Z]{10}")


def sanitize(html: str) -> str:
    html = CSRF_META.sub(r"\1REDACTED_CSRF\2", html)
    html = AUTH_TOKEN.sub(r"\1REDACTED_AUTH_TOKEN\2", html)
    html = SLACK_ID.sub("UREDACTED000", html)
    return html


def main(argv: list[str]) -> int:
    if not argv:
        print("usage: sanitize_fixtures.py <file.html> [more.html ...]", file=sys.stderr)
        return 2
    for raw in argv:
        path = Path(raw)
        original = path.read_text(encoding="utf-8")
        cleaned = sanitize(original)
        if cleaned != original:
            path.write_text(cleaned, encoding="utf-8")
            print(f"sanitized {path}")
        else:
            print(f"unchanged  {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
