# API Documentation

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

### System

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/health` | Health check including database connectivity | Public |

### Authentication

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/login` | Parent login | Public |
| `POST` | `/api/auth/logout` | Log out everywhere (invalidates all existing tokens) | Bearer token |
| `GET` | `/api/auth/me` | Current parent account and child profiles | Bearer token |
| `POST` | `/api/auth/parent-gate` | Re-enter the parent password to get a short-lived token for the parent dashboard | Bearer token |
| `POST` | `/api/auth/register` | Parent registration (optionally with the first child profile) | Public |

### Child profiles

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/children` | List child profiles for the logged-in parent | Bearer token |
| `POST` | `/api/children` | Create a child profile | Bearer token |

### Profile & progress

| Method | Path | Description | Auth |
|---|---|---|---|
| `PUT` | `/api/children/{child_id}/avatar` | Create or update the astronaut avatar | Bearer token |
| `GET` | `/api/children/{child_id}/daily` | Today's daily challenge | Bearer token |
| `GET` | `/api/children/{child_id}/profile` | Astronaut profile, avatar, XP, level and stats | Bearer token |
| `POST` | `/api/children/{child_id}/session` | Record that the child started a play session | Bearer token |
| `GET` | `/api/children/{child_id}/xp` | Total XP and level | Bearer token |
| `GET` | `/api/children/{child_id}/xp-history` | XP history (ledger) | Bearer token |

### Planets

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/children/{child_id}/planets/visited` | Planets this child has explored | Bearer token |
| `POST` | `/api/children/{child_id}/planets/{slug}/explore` | Mark a planet as explored (XP once) | Bearer token |
| `GET` | `/api/planets` | All planets (and the Sun) | Public |
| `GET` | `/api/planets/{slug}` | Planet details | Public |

### Missions

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/children/{child_id}/missions/history` | Mission attempt history | Bearer token |
| `GET` | `/api/children/{child_id}/missions/progress` | Mission progress for a child | Bearer token |
| `POST` | `/api/children/{child_id}/missions/{code}/check` | Instant feedback for one step (equipment item or emergency answer). Gives no XP. | Bearer token |
| `POST` | `/api/children/{child_id}/missions/{code}/complete` | Submit a mission result. The server validates it and awards XP (first success only). | Bearer token |
| `GET` | `/api/missions` | List training missions | Public |
| `GET` | `/api/missions/{code}` | Mission details and game configuration | Public |

### Quizzes

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/children/{child_id}/quizzes/best` | Best quiz results for a child | Bearer token |
| `POST` | `/api/children/{child_id}/quizzes/{slug}/submit` | Submit answers; server scores them | Bearer token |
| `GET` | `/api/quizzes` | List quizzes | Public |
| `GET` | `/api/quizzes/{slug}` | Quiz questions (answers are not included) | Public |

### Rocket Lab

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/children/{child_id}/rocket/builds` | Saved rocket designs | Bearer token |
| `POST` | `/api/children/{child_id}/rocket/builds` | Save a rocket design | Bearer token |
| `POST` | `/api/children/{child_id}/rocket/launch` | Launch a rocket (validated server-side) | Bearer token |
| `POST` | `/api/children/{child_id}/rocket/validate` | Test the rocket assembly | Bearer token |
| `GET` | `/api/rocket/parts` | Rocket parts catalogue | Public |

### AstroBot AI

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/astrobot/status` | Whether AstroBot is in live AI or curated demo mode | Public |
| `POST` | `/api/children/{child_id}/astrobot/chat` | Ask AstroBot a question | Bearer token |
| `GET` | `/api/children/{child_id}/astrobot/usage` | Today's AstroBot usage for a child | Bearer token |

### Rewards & certificates

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/badges` | All badges that can be earned | Public |
| `GET` | `/api/children/{child_id}/badges` | Earned and locked badges | Bearer token |
| `GET` | `/api/children/{child_id}/certificate` | Certificate eligibility and status | Bearer token |
| `POST` | `/api/children/{child_id}/certificate` | Generate (issue) the certificate | Bearer token |
| `GET` | `/api/children/{child_id}/certificate/pdf` | Download the certificate PDF | Bearer token |

### Parent dashboard

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/parent/account` | Parent account details | Bearer token |
| `PUT` | `/api/parent/account` | Update parent display name | Bearer token |
| `POST` | `/api/parent/change-password` | Change password (logs out all other sessions) | Bearer token |
| `DELETE` | `/api/parent/children/{child_id}` | Delete a child profile and all of its data | Bearer token |
| `DELETE` | `/api/parent/children/{child_id}/ai-history` | Delete stored AstroBot conversations | Bearer token |
| `GET` | `/api/parent/children/{child_id}/report` | Detailed learning report for one child | Bearer token |
| `PUT` | `/api/parent/children/{child_id}/settings` | Update AI controls and profile settings | Bearer token |
| `GET` | `/api/parent/overview` | All children with summary progress | Bearer token |

### NASA data

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/nasa/apod` | NASA Astronomy Picture of the Day (cached, refreshed in the background; never errors) | Public |
