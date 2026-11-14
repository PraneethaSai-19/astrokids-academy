# Database design

Works on **SQLite** (default, zero setup) and **MySQL 8** (InnoDB, utf8mb4). Tables are defined once, in
`backend/app/models`, and exposed as `database/schema.sql` (MySQL DDL), an Alembic migration
(`backend/migrations/versions/0001_initial_schema.py`) and `Base.metadata.create_all` (used automatically at start-up).

## Tables

The 13 tables required by the brief, plus 6 supporting tables.

| Table | Purpose | Key constraints |
|---|---|---|
| `parents` | parent accounts (email, Argon2 hash, token version) | unique `email` |
| `children` | child profiles (nickname, age group, AI settings) | FK `parent_id` (cascade); unique `(parent_id, nickname)` |
| `astronaut_profiles` | avatar configuration | FK `child_id` unique (one per child) |
| `planets` | Sun + 8 planets, facts, sizes, colours | unique `slug` |
| `missions` | 5 training missions, XP reward, instructions | unique `code` |
| `mission_progress` | per child per mission summary (attempts, best score, completed) | unique `(child_id, mission_id)`; check 0-100 |
| `quizzes`, `quiz_questions` | quiz content (answers stay server-side) | unique `(quiz_id, order_index)` |
| `quiz_attempts` | every quiz submission and score | FK `child_id`, `quiz_id` |
| `badges` | 8 badges | unique `code` |
| `earned_badges` | badges a child has earned | unique `(child_id, badge_id)` blocks duplicates |
| `rocket_builds` | saved and launched rocket designs (JSON components) | FK `child_id` |
| `ai_sessions` | per child per day AstroBot usage counters | unique `(child_id, session_date)` |
| *`ai_messages`* | questions/answers kept for parent review (deletable) | FK `session_id` (cascade) |
| *`mission_attempts`* | full play history | FK `child_id`, `mission_id` |
| *`xp_events`* | XP ledger | unique `(child_id, source_key)` makes rewards one-time |
| *`planet_visits`* | planets explored | unique `(child_id, planet_id)` |
| *`child_sessions`* | play-session history for the parent dashboard | FK `child_id` |
| *`certificates`* | issued certificate per child | unique `child_id`, unique `certificate_code` |

Deleting a parent deletes their children and all child data (`ON DELETE CASCADE`), which is what the parent-area
"Delete astronaut" button relies on.

Total XP is **derived** (`SUM(xp_events.amount)`) instead of stored, so it can never drift from the history.

## Setting up

```
python -m app.db_setup             # create tables + seed
python -m app.db_setup --demo      # + demo parent account
python -m app.db_setup --migrate   # use Alembic instead of create_all
python -m app.db_setup --reset     # drop everything first (asks you to type YES)
```

Changing the models later: `alembic revision --autogenerate -m "describe change"` then `alembic upgrade head`
(run from `backend/`). If a database was created by `create_all`, run `alembic stamp head` once before using migrations.
