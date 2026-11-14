"""Initialise the database: create tables, seed content, optionally create a demo account.

Usage (from the backend folder, with the venv active):
    python -m app.db_setup                 # create tables + seed planets/missions/quizzes/badges
    python -m app.db_setup --demo          # ...and create the demo parent account
    python -m app.db_setup --migrate       # use Alembic migrations instead of create_all
    python -m app.db_setup --reset --demo  # DROP everything first (asks for confirmation)
"""
import argparse
import sys

from sqlalchemy import func, select, text
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app import models  # noqa: F401
from app.core.config import get_settings
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models import Child, Parent
from app.seed import seed_content

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "Rocket2024"
DEMO_NICKNAME = "DemoCadet"


def create_demo(db) -> bool:
    if db.scalar(select(Parent.id).where(func.lower(Parent.email) == DEMO_EMAIL)):
        return False
    parent = Parent(email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD), display_name="Demo Parent")
    db.add(parent)
    db.flush()
    db.add(Child(parent_id=parent.id, nickname=DEMO_NICKNAME, age_group="6-8"))
    db.commit()
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description="AstroKids Academy database setup")
    ap.add_argument("--demo", action="store_true", help="create a demo parent account")
    ap.add_argument("--migrate", action="store_true", help="apply Alembic migrations instead of create_all")
    ap.add_argument("--reset", action="store_true", help="drop all tables first (destructive)")
    ap.add_argument("--yes", action="store_true", help="do not ask for confirmation on --reset")
    args = ap.parse_args()

    settings = get_settings()
    kind = "SQLite" if settings.is_sqlite else "MySQL"
    safe_url = engine.url.render_as_string(hide_password=True)
    print(f"Database: {kind}  ({safe_url})")

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except (OperationalError, SQLAlchemyError) as exc:
        print("\nERROR: could not connect to the database.")
        print(f"  {str(exc).splitlines()[0][:300]}")
        if not settings.is_sqlite:
            print("\nCheck that: MySQL is running, the database exists, and DATABASE_URL in backend/.env has the")
            print("right user, password, host and database name (see README, 'MySQL setup').")
        return 1

    if args.reset:
        if not args.yes and input("This DELETES all data in this database. Type YES to continue: ").strip() != "YES":
            print("Cancelled.")
            return 1
        Base.metadata.drop_all(bind=engine)
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        print("All tables dropped.")

    if args.migrate:
        from alembic import command
        from alembic.config import Config
        from app.core.config import BACKEND_DIR
        cfg = Config(str(BACKEND_DIR / "alembic.ini"))
        cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
        command.upgrade(cfg, "head")
        print("Alembic migrations applied.")
    else:
        Base.metadata.create_all(bind=engine)
        print("Tables created (if they were missing).")

    with SessionLocal() as db:
        seed_content(db)
        print("Seed data loaded: planets, missions, quizzes, badges.")
        if args.demo:
            if create_demo(db):
                print(f"Demo account created:  {DEMO_EMAIL}  /  {DEMO_PASSWORD}   (astronaut: {DEMO_NICKNAME})")
            else:
                print(f"Demo account already exists ({DEMO_EMAIL}).")
    print("\nDone. Start the API with:  uvicorn app.main:app --reload --port 8000")
    return 0


if __name__ == "__main__":
    sys.exit(main())
