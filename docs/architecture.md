# Architecture

```
Browser (React + Vite, port 5173)
   |  /api/*  (Vite dev-server proxy, no CORS needed in development)
   v
FastAPI (port 8000) ── routers (app/api) ── services (app/services) ── game rules (app/game)
   |                                          |
   |                                          └─ AI layer (app/ai): safety filter -> provider -> output filter
   v
SQLAlchemy ORM ── SQLite (default) or MySQL 8
```

## Principles

1. **The server owns the rules.** Games run in the browser, but the backend validates every result
   (`app/game/missions.py`), decides success, score and XP, and keeps answer keys (equipment categories, emergency
   answers, quiz answers) private. The public mission config sent to the browser contains no answers.
2. **Rewards are idempotent.** `xp_events` has a unique `(child_id, source_key)` constraint. Replaying a request
   cannot pay twice (mission first clear, planet first visit, quiz answer #n, first rocket launch, badge, daily bonus).
3. **Parent-managed, privacy-first.** Only a parent account exists. Children are nicknames under a parent. Parent
   dashboard routes need a second, short-lived "parent gate" token obtained by re-entering the password.
4. **AI is optional and safe.** Keys live in `backend/.env`. Without a key, AstroBot answers from a curated set and
   labels it as such. With a key, requests pass an input filter (personal info, unsafe topics, self-harm), the model's
   answer passes an output filter, and per-child daily limits and a rate limiter apply.

## Backend modules (`backend/app`)

| Folder | Purpose |
|---|---|
| `core/` | settings (`config.py`), Argon2 + JWT (`security.py`), in-memory rate limiter |
| `models/` | SQLAlchemy tables: users, content (seeded), progress, AI sessions |
| `schemas/` | Pydantic request validation |
| `api/` | FastAPI routers: auth, profile, planets, missions, quizzes, rocket, astrobot, rewards, parent, deps (auth/authorization) |
| `services/` | progression (XP, levels, badges, daily challenge), certificate PDF (ReportLab), child helpers |
| `game/` | mission rules and configs, rocket parts and validation, level table, daily challenges |
| `ai/` | system prompt, safety filters, curated answers, LLM provider adapters (OpenAI-compatible and Anthropic) |
| `seed.py` | planets, missions, quizzes, badges (upsert, safe to re-run) |
| `db_setup.py` | CLI to create tables / run migrations / seed / create a demo account |

## Frontend (`frontend/src`)

| Folder | Purpose |
|---|---|
| `pages/` | one component per screen (Splash, Auth, Avatar, Dashboard, Solar System, Missions, Rocket Lab, AstroBot, Achievements, Certificate, Parent, Profile) |
| `features/solar-system` | React Three Fiber scene, procedural planet textures (canvas), 2D fallback |
| `features/missions` | the five playable games and the quiz player |
| `components/` | Astronaut and rocket SVGs, AstroBot mascot, layout, reward modal, shared UI |
| `context/` | app state: auth, active child, profile, reward celebration, preferences |
| `services/api.js` | Axios client and every endpoint call; friendly error messages |
| `utils/` | WebAudio sound effects, text-to-speech, WebGL detection, preferences |

Large pages (the 3D solar system especially) are lazy-loaded, and the Three.js bundle is split into its own chunk.

## Performance and accessibility

- Procedural textures (no image downloads), 36 segment spheres (20 on low-power devices), device-pixel-ratio capped,
  no shadows, and a 2D fallback when WebGL is missing or the context is lost.
- Reduced-motion: honours the OS setting and has an in-app switch; the orbit pause button stops animation.
- Touch controls for every game, minimum 44-48 px tap targets, keyboard support, ARIA labels and live regions.
