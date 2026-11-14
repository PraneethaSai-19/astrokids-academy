"""Load (or refresh) the seed data: planets, missions, quizzes and badges.

The content itself lives in backend/app/seed.py so the API and this script share one source of truth.
Run from the project root (backend virtual environment active):

    cd backend
    python ../database/seed_data.py            # content only
    python ../database/seed_data.py --demo     # content + demo parent account
"""
import runpy
import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(backend))
sys.argv[0] = "app.db_setup"
runpy.run_module("app.db_setup", run_name="__main__")
