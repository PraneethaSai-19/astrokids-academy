# Junior Astronaut Mission Trainer (AstroKids Academy)

*Train Like an Astronaut. Explore Like a Scientist!*

A full-stack educational space game for children aged 6-10: create an astronaut, fly through a 3D solar system, play
five astronaut-training mini-games, build and launch rockets, chat with the AI robot **AstroBot**, earn XP and
badges, and receive a printable Junior Astronaut certificate. Accounts are managed by a parent.

**Stack:** React 18 + Vite + Tailwind + Three.js (React Three Fiber) + Framer Motion | FastAPI + SQLAlchemy + Pydantic |
SQLite (default) or MySQL 8 | Argon2 + JWT | ReportLab | pytest + Vitest.

---

## 1. Quick start on Windows (about 10 minutes)

### Prerequisites

| Software | Version | Get it |
|---|---|---|
| Python | **3.10, 3.11 or 3.12** (3.9 is too old) | https://www.python.org/downloads/windows/ - tick **"Add python.exe to PATH"** |
| Node.js | 18 LTS or newer (20/22/24 fine) | https://nodejs.org/ (LTS installer, includes npm) |
| VS Code (optional) | any | https://code.visualstudio.com/ |
| MySQL 8 (optional) | 8.0+ | only if you want MySQL; SQLite works with no install |

Check in a terminal: `py -0p` (lists Pythons), `node --version`, `npm --version`.
You can have several Python versions installed; the scripts automatically pick 3.13/3.12/3.11/3.10 through the `py` launcher.

### Install and run

1. Extract `Junior-Astronaut-Mission-Trainer.zip` somewhere with a short path, e.g. `C:\Projects\`.
2. Open the folder in VS Code (**File > Open Folder**) and open a terminal (**Terminal > New Terminal**), or just use Windows Explorer.
3. **Run once:** double-click `scripts\setup_windows.bat` (or in the terminal: `scripts\setup_windows.bat`).
   It creates the Python virtual environment, installs the backend and frontend packages, creates `backend\.env`
   with a random secret key, creates the database and loads planets/missions/quizzes/badges, and creates a demo account.
4. **Start the app:** double-click `scripts\start_all.bat`. It opens two windows (backend and frontend) and your browser.

| What | URL |
|---|---|
| The game | http://localhost:5173 |
| API (Swagger docs) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health |

**Demo account** (created by setup): `demo@example.com` / `Rocket2024`, astronaut **DemoCadet**.
Or press *Start Your Journey > Create a parent account* to register your own.

To stop: close the two console windows (or press `Ctrl+C` in them).

### Starting the pieces separately

```bash
scripts\start_backend.bat     # API on http://localhost:8000
scripts\start_frontend.bat    # website on http://localhost:5173
```

Or manually, in two terminals:

```bash
cd backend
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```
```bash
cd frontend
npm run dev
```

---

## 2. Database

### SQLite (default)
Nothing to do. The file `backend/astrokids.db` is created automatically.

### MySQL 8
1. Install MySQL Server 8 (https://dev.mysql.com/downloads/installer/) and remember the `root` password you choose.
2. Open `database\create_database.sql`, **change `CHANGE_ME_STRONG_PASSWORD`** to your own password, then run it:
   ```bash
   mysql -u root -p < database\create_database.sql
   ```
   (If `mysql` is not recognised, use the full path, e.g.
   `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < database\create_database.sql`,
   or run the contents in MySQL Workbench.)
3. In `backend\.env` set (same password as in step 2):
   ```
   DATABASE_URL=mysql+pymysql://astrokids:YOUR_PASSWORD@localhost:3306/astrokids?charset=utf8mb4
   ```
   If the password contains special characters such as `@ : / #`, URL-encode them (`@` becomes `%40`).
4. Create the tables and load the content:
   ```bash
   cd backend
   .venv\Scripts\python -m app.db_setup --demo
   ```
5. Start the app normally. `http://localhost:8000/api/health` should show `"database_type":"mysql"`.

Switch back to SQLite at any time by commenting out `DATABASE_URL`. The two databases are separate (progress does not move across).

Other options: `python -m app.db_setup --migrate` (Alembic), `--reset` (wipe, asks you to type YES). The raw MySQL DDL is in
`database\schema.sql`; see `docs\database-design.md`.

---

## 3. AstroBot AI

AstroBot works **out of the box in demo mode**: curated, fact-checked answers to common space questions. Demo answers
are clearly labelled "Curated educational answer (demo mode), not a live AI response".

To enable live AI, edit `backend\.env` (the key stays on the server, never in the browser) and restart the backend:

```ini
# Anthropic (Claude)
AI_PROVIDER=anthropic
AI_API_KEY=your-key-here
AI_MODEL=claude-haiku-5-5

# ...or any OpenAI-compatible service (OpenAI, Groq, OpenRouter, a local Ollama server ...)
AI_PROVIDER=openai
AI_API_KEY=your-key-here
AI_MODEL=gpt-4o-mini
AI_BASE_URL=            # optional, e.g. http://localhost:11434/v1 for Ollama
```

AstroBot's page shows "Live AI mode" when it is active. If the provider is unreachable it falls back to curated answers
and says so. Safety: a child-friendly system prompt, an input filter (personal info, unsafe topics, self-harm - with
a "talk to a grown-up" reply), an output filter, a per-minute rate limit and a **daily question limit per child**.
Parents can switch AstroBot off, disable live answers, change the limit and delete the saved conversations
(*Parents > AstroBot controls*).

> I could not test live AI responses because that needs your own API key. The provider code builds standard requests for both APIs and
> failures degrade to demo mode; please try it once with your key.

---

## 4. NASA data and credits

- **NASA Astronomy Picture of the Day (APOD)**: the Home page shows NASA's daily picture, fetched through the backend
  (https://api.nasa.gov, endpoint `GET /api/nasa/apod`). Only images are shown, the text is shortened for children,
  the credit is displayed and the result is cached for 6 hours. If NASA is unreachable the card shows a friendly message
  and nothing else breaks. The default `NASA_API_KEY=DEMO_KEY` is rate-limited; get a free key at https://api.nasa.gov
  and put it in `backend\.env` for heavier use.
- **NASA Image and Video Library** (https://images.nasa.gov, no key needed): used automatically for a space picture when
  APOD has no usable photo or is slow. The card says which NASA source the picture came from and links back to NASA.
  The last good picture is also saved to `backend\nasa_cache.json` and shown while NASA is slow.
- **Planet facts**: sizes, distances, temperatures and moon counts are based on NASA Solar System Exploration / planetary
  fact-sheet data (https://science.nasa.gov/solar-system/), simplified for ages 6-10.
- Everything else (artwork, sounds, planets textures, games) is original and generated in code.
- This project is not endorsed by or affiliated with NASA.

## 5. Testing

```bash
cd backend
.venv\Scripts\python -m pytest -q          # backend: 28 tests (auth, XP, badges, rockets, AI safety, certificate, parent gate ...)
cd ..\frontend
npm test                                    # frontend: component tests (Vitest)
npm run build                               # production build check
```

---

## 6. Using the app (what to try)

| Screen | What it does |
|---|---|
| Splash > Parent sign-up/login | parent-managed accounts; Argon2 password hashing; password rules shown live |
| Who is training? | pick or add an astronaut (nickname + age group only) |
| Avatar creator | suit, helmet, visor, backpack, accessory with live preview, saved to the database |
| Home | level, XP bar, daily mission (+50 XP), badges, navigation cards |
| Explore Planets | 3D solar system: drag, zoom/pinch, tap a planet. Info panel, fun facts, "Read to me", Explore button (+XP once per planet). Light 2D view if WebGL is unavailable |
| Training Missions | 1 Zero Gravity (jetpack drift, stars, rocks), 2 Space Navigation (plan a route), 3 Equipment Expert (drag and drop), 4 Moon Landing (thrusters), 5 Emergency Rescue (scenarios), plus two quizzes |
| Rocket Lab | drag or tap parts into five spots, test, save, countdown and launch animation, +150 XP first launch |
| AstroBot | chat, suggested questions, typing animation, read-aloud, microphone input (Chrome/Edge), clear chat |
| Trophies | 8 badges (locked/earned), mission progress, XP history |
| Certificate | unlocked after all 5 missions; preview and PDF download |
| Parents | re-enter the password: progress, quiz results, sessions, AI controls, account, privacy, delete data |

XP rewards: Zero Gravity 100, Navigation 120, Equipment 150, Moon Landing 200, Emergency 250 (first success only).
Levels: Space Cadet 0, Junior Explorer 200, Junior Astronaut 500, Space Scientist 900, Mission Commander 1400, Galaxy Explorer 2000.
Controls: arrow keys / WASD / Space, or the on-screen buttons on touch devices.

> These are simplified educational games, not real astronaut training or an accurate engineering simulator.

---

## 7. Troubleshooting

**Windows / scripts**
- *"Python 3.10 or newer was not found"*: install Python 3.12 and tick *Add python.exe to PATH*; reopen the terminal. If your default `python` is 3.9, the scripts still use `py -3.11` / `py -3.12` when installed.
- *"running scripts is disabled" in PowerShell*: use `cmd` (or double-click the `.bat`), or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- *"No space left on device" during install*: free disk space on the drive that holds `%TEMP%` (usually C:), or set `TEMP`/`TMP` to a folder on another drive and re-run setup.
- Antivirus or a very long folder path can break `npm install`; move the project to something like `C:\AstroKids`.

**Backend**
- *Port 8000 in use*: `netstat -ano | findstr :8000` then `taskkill /PID <pid> /F`, or start with `--port 8001` (and set `VITE_API_URL`/proxy accordingly).
- *`ModuleNotFoundError`*: you are not using the project's venv. Use `backend\.venv\Scripts\python`, or run setup again.
- *"Using the development SECRET_KEY"* warning: `backend\.env` is missing a real `SECRET_KEY`; run `scripts\setup_windows.bat` (it never overwrites an existing `.env`).
- *Frontend shows "Cannot reach the space station"*: the backend is not running on port 8000; start `scripts\start_backend.bat` and check http://localhost:8000/api/health.

**Frontend**
- *`npm install` fails (EACCES / network)*: check your internet connection and proxy; delete `frontend\node_modules` and retry.
- *Blank 3D view or "2D view" notice*: WebGL is off or the GPU ran out of contexts. Enable hardware acceleration in your browser, update graphics drivers and reload. The 2D view works everywhere.
- *No sound*: browsers start audio after the first click/tap; check the speaker button in the top bar.

**MySQL**
- *`Can't connect to MySQL server` (2003)*: the MySQL80 service is not running (`services.msc`), wrong port, or wrong host.
- *`Access denied for user` (1045)*: wrong password in `DATABASE_URL`; remember to URL-encode special characters.
- *`Unknown database 'astrokids'` (1049)*: run `database\create_database.sql` first.
- *`cryptography` / `caching_sha2_password` errors*: already handled by the pinned `PyMySQL` + `cryptography` packages; reinstall with `pip install -r backend\requirements.txt`.

**AI**
- *Answers say "demo mode"*: `AI_PROVIDER` is `demo` or `AI_API_KEY` is empty in `backend\.env`; restart the backend after editing.
- *"AstroBot's live radio is offline"*: the provider returned an error or timed out (invalid key, no credit, no internet); check the backend console. Answers continue in demo mode.
- *"You've asked all your questions for today"*: the parent's daily limit was reached (Parents > AstroBot controls).

---

## 8. Project structure

```
Junior-Astronaut-Mission-Trainer/
├── frontend/   React app (src/pages, features, components, context, services, utils)
├── backend/    FastAPI app (app/api, core, models, schemas, services, ai, game), migrations/, tests/
├── database/   schema.sql (MySQL DDL), create_database.sql, seed_data.py
├── docs/       architecture.md, database-design.md, api-documentation.md
├── scripts/    setup_windows.bat, start_backend.bat, start_frontend.bat, start_all.bat
├── README.md   .gitignore   LICENSE
```

See `docs/architecture.md` for how the pieces fit together.

## 9. Security and privacy notes

- Parent-managed accounts; only email, nickname and age group are stored. No public profiles, no chat between users.
- Argon2id password hashing; JWT sessions (12 h) that all expire on logout or password change; parent area needs a fresh password check.
- Rewards, scores and answer keys are server-side; the browser cannot grant itself XP.
- API rate limiting (login/registration, AstroBot) and input validation everywhere.
- Never commit `backend\.env`. For a real deployment: HTTPS, a strong `SECRET_KEY`, `ENVIRONMENT=production`, a managed MySQL, and a shared rate-limit store (the built-in limiter is in-memory and single-process).

## Known limitations

- The in-memory rate limiter resets when the backend restarts and is per-process.
- Narration/voice use the browser's built-in speech features; availability varies by browser. Speech input works in Chrome/Edge.
- Child progress is tied to the parent's login on the device; there is no separate child login by design.
