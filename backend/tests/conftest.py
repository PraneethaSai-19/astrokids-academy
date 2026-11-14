import os
import sys
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="astrokids_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp, 'test.db').as_posix()}"
os.environ["ENVIRONMENT"] = "test"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only-0123456789"
os.environ["AI_PROVIDER"] = "demo"
os.environ["AI_API_KEY"] = ""
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.rate_limit import limiter  # noqa: E402
from app.database import Base, engine  # noqa: E402
from app.main import app, init_database  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    init_database()
    limiter.reset()
    with TestClient(app) as c:
        yield c


def register(client, email="parent@example.com", password="Rocket123", nickname="Nova"):
    r = client.post("/api/auth/register", json={
        "email": email, "password": password, "display_name": "Pat", "accept_parent_terms": True,
        "child": {"nickname": nickname, "age_group": "6-8"}})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def auth(client):
    h = register(client)
    child_id = client.get("/api/auth/me", headers=h).json()["children"][0]["id"]
    return h, child_id


def complete_all_missions(client, h, cid):
    """Submit valid winning results for every mission (uses the public config / known solutions)."""
    from app.game import missions as m
    wins = {
        "zero_gravity": {"stars_collected": 5, "reached_station": True, "hits": 0, "duration_seconds": 40},
        "space_navigation": {"routes": {
            "1": list("DDRRRRUURR"[:0]) or ["U", "U", "R", "R", "R", "R", "R", "R", "D"],
            "2": [], "3": []}},
        "equipment_expert": {"placements": {i["id"]: i["category"] for i in m.EQUIPMENT_ITEMS}, "mistakes": 0},
        "moon_landing": {"landing_x": 180, "vertical_speed": 1.5, "horizontal_speed": 0.5,
                         "fuel_left": 50, "duration_seconds": 30},
        "emergency_rescue": {"answers": {s["id"]: s["correct"] for s in m.EMERGENCY_SCENARIOS}},
    }
    # Compute navigation routes with a BFS so the test doesn't hard-code paths
    from collections import deque
    routes = {}
    for lvl in m.NAV_LEVELS:
        blocked = {tuple(a) for a in lvl["asteroids"]}
        start, goal = tuple(lvl["start"]), tuple(lvl["goal"])
        q, seen = deque([(start, [])]), {start}
        while q:
            pos, path = q.popleft()
            if pos == goal:
                routes[str(lvl["id"])] = path
                break
            for d, (dx, dy) in m._DIRS.items():
                n = (pos[0] + dx, pos[1] + dy)
                if 0 <= n[0] < lvl["cols"] and 0 <= n[1] < lvl["rows"] and n not in blocked and n not in seen:
                    seen.add(n)
                    q.append((n, path + [d]))
    wins["space_navigation"] = {"routes": routes}
    out = {}
    for code, result in wins.items():
        r = client.post(f"/api/children/{cid}/missions/{code}/complete", json={"result": result}, headers=h)
        assert r.status_code == 200, r.text
        out[code] = r.json()
    return out
