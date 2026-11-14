"""Regenerate docs/api-documentation.md from the FastAPI OpenAPI schema.

Run from the project root with the backend virtual environment:
    backend\\.venv\\Scripts\\python scripts\\gen_api_docs.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.main import app  # noqa: E402

ORDER = ["System", "Authentication", "Child profiles", "Profile & progress", "Planets", "Missions", "Quizzes",
         "Rocket Lab", "AstroBot AI", "Rewards & certificates", "Parent dashboard"]

HEADER = """# API Documentation

The interactive, always-current reference is the Swagger UI at **http://localhost:8000/docs** (ReDoc at `/redoc`,
raw schema at `/openapi.json`) while the backend is running. This page is generated from the same OpenAPI schema
(`python scripts/gen_api_docs.py`).

## Authentication model

- `POST /api/auth/register` or `/api/auth/login` returns a JWT (`Authorization: Bearer <token>`). It identifies a
  **parent**; children never log in separately.
- Every `/api/children/{child_id}/...` route checks that the child belongs to the logged-in parent (otherwise **404**,
  so other families' profiles are never revealed).
- Every `/api/parent/...` route needs a **parent-gate token** from `POST /api/auth/parent-gate` (the parent re-enters
  their password; the token lasts 30 minutes). A normal session token gets **403** there.
- `POST /api/auth/logout` bumps the account's token version, which invalidates all existing tokens.

## Reward rules (server-side)

- The browser sends only *what happened* (stars collected, a route, answers). The server validates it, decides
  success/score and computes XP. Fields such as `xp` are ignored.
- XP is recorded in a ledger with a unique `(child_id, source_key)` key, so each reward (mission first clear, planet
  visit, quiz answer #n, first rocket launch, badge, daily bonus) can be granted **only once**.
- Badges are evaluated from stored progress after every rewarding action; duplicates are blocked by a unique constraint.

## Status codes

`200/201` success - `401` missing/invalid/expired token - `403` not allowed (parent gate, certificate not earned,
AI disabled) - `404` not found or not yours - `409` duplicate - `422` invalid input or implausible game result -
`429` rate limit or daily AI limit.

## Endpoints
"""


def main() -> None:
    spec = app.openapi()
    groups: dict[str, list] = {}
    for path, ops in spec["paths"].items():
        for method, op in ops.items():
            tag = (op.get("tags") or ["Other"])[0]
            groups.setdefault(tag, []).append((method.upper(), path, op.get("summary", ""), "security" in op))
    lines = [HEADER]
    for tag in ORDER + [t for t in groups if t not in ORDER]:
        if tag not in groups:
            continue
        lines += [f"### {tag}", "", "| Method | Path | Description | Auth |", "|---|---|---|---|"]
        for m, p, s, auth in sorted(groups[tag], key=lambda x: (x[1], x[0])):
            lines.append(f"| `{m}` | `{p}` | {s} | {'Bearer token' if auth else 'Public'} |")
        lines.append("")
    out = ROOT / "docs" / "api-documentation.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"{sum(len(v) for v in groups.values())} endpoints written to {out}")


if __name__ == "__main__":
    main()
