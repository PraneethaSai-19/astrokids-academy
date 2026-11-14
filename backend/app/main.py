"""AstroKids Academy API entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app import models  # noqa: F401  (register tables)
from app.api import astrobot, auth, missions, nasa, parent, planets, profile, quizzes, rewards, rocket
from app.core.config import get_settings
from app.database import Base, SessionLocal, engine
from app.seed import seed_content

log = logging.getLogger("astrokids")


def init_database() -> None:
    """Create tables if missing and (re)seed educational content. Safe to run repeatedly."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_content(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    yield


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Backend for Junior Astronaut Mission Trainer (AstroKids Academy). "
                "Rewards are computed on the server; the browser never sends XP values. "
                "SI disclosure: this code was generated with an AI coding assistant (Claude Code).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, auth.children_router, profile.router, planets.router, missions.router,
          quizzes.router, rocket.router, astrobot.router, rewards.router, parent.router, nasa.router):
    app.include_router(r)


@app.get("/api/health", tags=["System"], summary="Health check including database connectivity")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:  # noqa: BLE001
        db_ok = False
    from app.ai.provider import provider_status
    return {"status": "ok" if db_ok else "degraded", "database": "connected" if db_ok else "unavailable",
            "database_type": "sqlite" if settings.is_sqlite else "mysql", "ai": provider_status(settings)}


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    msgs = []
    for e in exc.errors():
        field = ".".join(str(p) for p in e.get("loc", []) if p not in ("body", "query", "path"))
        msg = str(e.get("msg", "Invalid value")).replace("Value error, ", "")
        msgs.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(status_code=422, content={"detail": "; ".join(msgs) or "Invalid request.", "errors": msgs})


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our space station. Please try again."})
