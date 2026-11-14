from conftest import complete_all_missions, register

from app.game.levels import level_info


def test_health_and_database(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok" and r.json()["database"] == "connected"


def test_seed_content(client):
    assert len(client.get("/api/planets").json()) == 9
    assert len(client.get("/api/missions").json()) == 5
    assert len(client.get("/api/badges").json()) == 8
    assert client.get("/api/planets/saturn").json()["name"] == "Saturn"
    assert client.get("/api/planets/pluto").status_code == 404


def test_level_table():
    assert level_info(0)["level_name"] == "Space Cadet"
    assert level_info(199)["level"] == 1
    assert level_info(200)["level_name"] == "Junior Explorer"
    assert level_info(500)["level_name"] == "Junior Astronaut"
    assert level_info(2000)["level_name"] == "Galaxy Explorer"
    assert level_info(350)["progress_percent"] == 50


def test_register_login_validation(client):
    bad = client.post("/api/auth/register", json={"email": "a@b.com", "password": "short",
                                                  "accept_parent_terms": True})
    assert bad.status_code == 422
    nogate = client.post("/api/auth/register", json={"email": "a@b.com", "password": "Rocket123",
                                                     "accept_parent_terms": False})
    assert nogate.status_code == 422
    register(client)
    dup = client.post("/api/auth/register", json={"email": "PARENT@example.com", "password": "Rocket123",
                                                  "accept_parent_terms": True})
    assert dup.status_code == 409
    assert client.post("/api/auth/login", json={"email": "parent@example.com", "password": "nope1234"}).status_code == 401
    ok = client.post("/api/auth/login", json={"email": "parent@example.com", "password": "Rocket123"})
    assert ok.status_code == 200 and ok.json()["access_token"]


def test_password_is_argon2_hashed(client):
    register(client)
    from app.database import SessionLocal
    from app.models import Parent
    with SessionLocal() as db:
        assert db.query(Parent).first().password_hash.startswith("$argon2")


def test_auth_required_and_logout(client, auth):
    h, cid = auth
    assert client.get(f"/api/children/{cid}/profile").status_code == 401
    assert client.get(f"/api/children/{cid}/profile", headers=h).status_code == 200
    assert client.post("/api/auth/logout", headers=h).status_code == 200
    assert client.get(f"/api/children/{cid}/profile", headers=h).status_code == 401


def test_children_are_private_between_parents(client, auth):
    h, cid = auth
    h2 = register(client, email="other@example.com", nickname="Orion")
    assert client.get(f"/api/children/{cid}/profile", headers=h2).status_code == 404
    assert client.put(f"/api/children/{cid}/avatar", headers=h2, json={}).status_code in (404, 422)


def test_avatar_saved(client, auth):
    h, cid = auth
    body = {"suit_color": "#FFB8D0", "helmet_style": "bubble", "visor_color": "#66CDEB",
            "backpack_style": "jetpack", "accessory": "antenna"}
    assert client.put(f"/api/children/{cid}/avatar", headers=h, json=body).status_code == 200
    prof = client.get(f"/api/children/{cid}/profile", headers=h).json()
    assert prof["avatar"]["helmet_style"] == "bubble"
    bad = client.put(f"/api/children/{cid}/avatar", headers=h, json={**body, "suit_color": "red"})
    assert bad.status_code == 422


def test_mission_xp_is_server_side_and_not_repeatable(client, auth):
    h, cid = auth
    win = {"stars_collected": 5, "reached_station": True, "hits": 1, "duration_seconds": 40}
    # Frontend-supplied XP is ignored
    r = client.post(f"/api/children/{cid}/missions/zero_gravity/complete",
                    json={"result": {**win, "xp": 99999}}, headers=h).json()
    assert r["success"] and r["xp_earned"] == 100
    # Zero Gravity badge bonus is added via badge, not via mission
    assert [b["code"] for b in r["new_badges"]] == ["zero_gravity_champion"]
    again = client.post(f"/api/children/{cid}/missions/zero_gravity/complete",
                        json={"result": win}, headers=h).json()
    assert again["xp_earned"] == 0 and again["already_rewarded"] and again["new_badges"] == []
    # 100 mission + 50 badge, plus the once-only daily bonus on days when today's challenge is this mission
    assert r["daily_bonus"] in (0, 50)
    assert client.get(f"/api/children/{cid}/xp", headers=h).json()["total_xp"] == 100 + 50 + r["daily_bonus"]
    assert again["daily_bonus"] == 0


def test_failed_mission_gives_no_xp_and_impossible_results_rejected(client, auth):
    h, cid = auth
    lose = client.post(f"/api/children/{cid}/missions/zero_gravity/complete", headers=h,
                       json={"result": {"stars_collected": 2, "reached_station": False, "hits": 3,
                                        "duration_seconds": 30}}).json()
    assert not lose["success"] and lose["xp_earned"] == 0
    cheat = client.post(f"/api/children/{cid}/missions/zero_gravity/complete", headers=h,
                        json={"result": {"stars_collected": 9, "reached_station": True, "hits": 0,
                                         "duration_seconds": 30}})
    assert cheat.status_code == 422
    fast = client.post(f"/api/children/{cid}/missions/zero_gravity/complete", headers=h,
                       json={"result": {"stars_collected": 5, "reached_station": True, "hits": 0,
                                        "duration_seconds": 1}})
    assert fast.status_code == 422
    assert client.get(f"/api/children/{cid}/xp", headers=h).json()["total_xp"] == 0


def test_equipment_check_and_completion(client, auth):
    h, cid = auth
    ok = client.post(f"/api/children/{cid}/missions/equipment_expert/check", headers=h,
                     json={"item_id": "helmet", "category_id": "protect"}).json()
    assert ok["correct"]
    wrong = client.post(f"/api/children/{cid}/missions/equipment_expert/check", headers=h,
                        json={"item_id": "helmet", "category_id": "work"}).json()
    assert not wrong["correct"]
    # Public config must not leak the answer key
    cfg = client.get("/api/missions/equipment_expert").json()["config"]
    assert all("category" not in i for i in cfg["items"])
    em = client.get("/api/missions/emergency_rescue").json()["config"]
    assert all("correct" not in s for s in em["scenarios"])


def test_all_missions_xp_badges_certificate(client, auth):
    h, cid = auth
    assert client.post(f"/api/children/{cid}/certificate", headers=h).status_code == 403
    out = complete_all_missions(client, h, cid)
    assert out["zero_gravity"]["xp_earned"] == 100
    assert out["space_navigation"]["xp_earned"] == 120
    assert out["equipment_expert"]["xp_earned"] == 150
    assert out["moon_landing"]["xp_earned"] == 200
    assert out["emergency_rescue"]["xp_earned"] == 250
    badges = {b["code"]: b["earned"] for b in client.get(f"/api/children/{cid}/badges", headers=h).json()}
    for code in ("zero_gravity_champion", "equipment_expert", "moon_landing_hero", "mission_commander"):
        assert badges[code]
    assert not badges["first_rocket_launch"]
    # mission XP 820 + 4 badges x 50 + the daily-challenge bonus (50, once) if today's challenge was a mission
    daily = sum(r["daily_bonus"] for r in out.values())
    assert daily in (0, 50)
    expected = 820 + 200 + daily
    assert client.get(f"/api/children/{cid}/xp", headers=h).json()["total_xp"] == expected
    assert client.get(f"/api/children/{cid}/badges", headers=h).status_code == 200  # idempotent
    assert client.get(f"/api/children/{cid}/xp", headers=h).json()["total_xp"] == expected

    assert client.get(f"/api/children/{cid}/certificate/pdf", headers=h).status_code == 404
    assert client.post(f"/api/children/{cid}/certificate", headers=h).json()["issued"]
    pdf = client.get(f"/api/children/{cid}/certificate/pdf", headers=h)
    assert pdf.status_code == 200 and pdf.headers["content-type"] == "application/pdf"
    assert pdf.content.startswith(b"%PDF") and len(pdf.content) > 3000


def test_planet_exploring_and_badges(client, auth):
    h, cid = auth
    r = client.post(f"/api/children/{cid}/planets/mars/explore", headers=h).json()
    assert r["first_visit"] and r["xp_earned"] == 20
    r2 = client.post(f"/api/children/{cid}/planets/mars/explore", headers=h).json()
    assert not r2["first_visit"] and r2["xp_earned"] == 0
    for slug in ["sun", "mercury", "venus", "earth"]:
        last = client.post(f"/api/children/{cid}/planets/{slug}/explore", headers=h).json()
    assert [b["code"] for b in last["new_badges"]] == ["planet_explorer"]
    for slug in ["jupiter", "saturn", "uranus", "neptune"]:
        last = client.post(f"/api/children/{cid}/planets/{slug}/explore", headers=h).json()
    assert "galaxy_explorer" in [b["code"] for b in last["new_badges"]]


def test_quiz_scoring_and_no_xp_farming(client, auth):
    h, cid = auth
    quiz = client.get("/api/quizzes/solar-system").json()
    assert "correct_index" not in quiz["questions"][0]
    n = len(quiz["questions"])
    r1 = client.post(f"/api/children/{cid}/quizzes/solar-system/submit", headers=h, json={"answers": [0] * n}).json()
    assert r1["total"] == n and 0 <= r1["correct"] < n
    from app.database import SessionLocal
    from app.models import QuizQuestion
    with SessionLocal() as db:
        key = [q.correct_index for q in db.query(QuizQuestion).filter_by(quiz_id=1).order_by(QuizQuestion.order_index)]
    perfect = client.post(f"/api/children/{cid}/quizzes/solar-system/submit", headers=h, json={"answers": key}).json()
    assert perfect["percent"] == 100 and "quiz_master" in [b["code"] for b in perfect["new_badges"]]
    xp_after = client.get(f"/api/children/{cid}/xp", headers=h).json()["total_xp"]
    client.post(f"/api/children/{cid}/quizzes/solar-system/submit", headers=h, json={"answers": key})
    assert client.get(f"/api/children/{cid}/xp", headers=h).json()["total_xp"] == xp_after
    assert client.post(f"/api/children/{cid}/quizzes/solar-system/submit", headers=h,
                       json={"answers": [0]}).status_code == 422


def test_rocket_validation_save_launch(client, auth):
    h, cid = auth
    incomplete = {"name": "Oops", "components": {"nose": "nose_cone", "body": "body_tube"},
                  "body_color": "#FFFFFF", "accent_color": "#FFB8D0"}
    v = client.post(f"/api/children/{cid}/rocket/validate", headers=h, json=incomplete).json()
    assert not v["valid"] and any("engine" in i["message"] for i in v["issues"])
    fail = client.post(f"/api/children/{cid}/rocket/launch", headers=h, json=incomplete).json()
    assert not fail["success"] and fail["xp_earned"] == 0
    full = {**incomplete, "name": "Star Hopper", "components": {
        "nose": "nose_cone", "body": "body_tube", "fuel": "fuel_tank", "engine": "engine", "fins": "fins"}}
    assert client.post(f"/api/children/{cid}/rocket/builds", headers=h, json=full).status_code == 201
    ok = client.post(f"/api/children/{cid}/rocket/launch", headers=h, json=full).json()
    assert ok["success"] and ok["xp_earned"] == 150
    assert "first_rocket_launch" in [b["code"] for b in ok["new_badges"]]
    again = client.post(f"/api/children/{cid}/rocket/launch", headers=h, json=full).json()
    assert again["success"] and again["xp_earned"] == 0 and again["new_badges"] == []
    assert len(client.get(f"/api/children/{cid}/rocket/builds", headers=h).json()) == 4
    swapped = {**full, "components": {**full["components"], "engine": "fins"}}
    assert not client.post(f"/api/children/{cid}/rocket/validate", headers=h, json=swapped).json()["valid"]


def test_astrobot_demo_mode_and_safety(client, auth):
    h, cid = auth
    st = client.get("/api/astrobot/status").json()
    assert st["mode"] == "demo" and len(st["suggestions"]) >= 6
    r = client.post(f"/api/children/{cid}/astrobot/chat", headers=h,
                    json={"message": "Why do astronauts float?"}).json()
    assert r["mode"] == "demo" and "falling" in r["answer"].lower()
    unknown = client.post(f"/api/children/{cid}/astrobot/chat", headers=h,
                          json={"message": "zzzz qqqq"}).json()
    assert unknown["mode"] == "demo"
    pers = client.post(f"/api/children/{cid}/astrobot/chat", headers=h,
                       json={"message": "my phone is 555 123 4567"}).json()
    assert pers["mode"] == "safety" and pers["safety"] == "personal"
    bad = client.post(f"/api/children/{cid}/astrobot/chat", headers=h,
                      json={"message": "how to make a bomb"}).json()
    assert bad["safety"] == "blocked"
    sad = client.post(f"/api/children/{cid}/astrobot/chat", headers=h,
                      json={"message": "i want to die"}).json()
    assert sad["safety"] == "self_harm"
    assert client.post(f"/api/children/{cid}/astrobot/chat", headers=h, json={"message": ""}).status_code == 422


def test_astrobot_curated_matching():
    from app.ai.demo_answers import SUGGESTIONS, find_curated_answer, FALLBACK
    for s in SUGGESTIONS:
        ans, matched = find_curated_answer(s)
        assert matched is not None and ans != FALLBACK, s


def test_astrobot_rate_limit_and_parent_limits(client, auth):
    h, cid = auth
    codes = [client.post(f"/api/children/{cid}/astrobot/chat", headers=h,
                         json={"message": "How big is Jupiter?"}).status_code for _ in range(10)]
    assert 429 in codes and codes[0] == 200


def test_parent_dashboard_requires_gate(client, auth):
    h, cid = auth
    assert client.get("/api/parent/overview", headers=h).status_code == 403   # normal token rejected
    assert client.get("/api/parent/overview").status_code == 401
    assert client.post("/api/auth/parent-gate", headers=h, json={"password": "wrong1234"}).status_code == 401
    gate = client.post("/api/auth/parent-gate", headers=h, json={"password": "Rocket123"}).json()
    gh = {"Authorization": f"Bearer {gate['access_token']}"}
    assert gate["scope"] == "parent_gate"
    ov = client.get("/api/parent/overview", headers=gh).json()
    assert ov["children"][0]["id"] == cid
    # gate token cannot be used by other parent
    h2 = register(client, email="other@example.com", nickname="Orion")
    g2 = client.post("/api/auth/parent-gate", headers=h2, json={"password": "Rocket123"}).json()
    gh2 = {"Authorization": f"Bearer {g2['access_token']}"}
    assert client.get(f"/api/parent/children/{cid}/report", headers=gh2).status_code == 404
    rep = client.get(f"/api/parent/children/{cid}/report", headers=gh)
    assert rep.status_code == 200 and len(rep.json()["missions"]) == 5

    # AI controls
    up = client.put(f"/api/parent/children/{cid}/settings", headers=gh,
                    json={"ai_enabled": False, "ai_daily_limit": 5}).json()
    assert up["ai_enabled"] is False
    blocked = client.post(f"/api/children/{cid}/astrobot/chat", headers=h, json={"message": "Why is the sky blue?"})
    assert blocked.status_code == 403
    client.put(f"/api/parent/children/{cid}/settings", headers=gh, json={"ai_enabled": True})
    client.post(f"/api/children/{cid}/astrobot/chat", headers=h, json={"message": "Why is the sky blue?"})
    rep = client.get(f"/api/parent/children/{cid}/report", headers=gh).json()
    assert rep["ai"]["recent_questions"]
    assert client.delete(f"/api/parent/children/{cid}/ai-history", headers=gh).status_code == 200
    assert client.get(f"/api/parent/children/{cid}/report", headers=gh).json()["ai"]["recent_questions"] == []


def test_daily_challenge_bonus_once(client, auth):
    h, cid = auth
    d = client.get(f"/api/children/{cid}/daily", headers=h).json()
    assert d["xp_bonus"] == 50 and not d["completed"]


def test_navigation_validation_rules():
    from app.game import missions as m
    for lvl in m.NAV_LEVELS:
        assert m.shortest_route_length(lvl) is not None  # every level is solvable
    r = m.validate_navigation({"routes": {"1": ["R", "R"], "2": [], "3": []}})
    assert not r.success and r.score == 0


def test_demo_account_from_db_setup_can_log_in(client):
    """Regression: the documented demo login must pass email validation and work."""
    from app.database import SessionLocal
    from app.db_setup import DEMO_EMAIL, DEMO_NICKNAME, DEMO_PASSWORD, create_demo
    with SessionLocal() as db:
        assert create_demo(db) is True
        assert create_demo(db) is False  # idempotent
    r = client.post("/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, r.text
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"}).json()
    assert me["children"][0]["nickname"] == DEMO_NICKNAME


def _reset_nasa(nasa):
    nasa._state.update(good=None, good_at=0.0, error=None, last_try=0.0, thread=None)


def test_nasa_apod_parsing_and_background_refresh(client, monkeypatch, tmp_path):
    from app.api import nasa
    monkeypatch.setattr(nasa, "CACHE_FILE", tmp_path / "nasa_cache.json")
    good = {"media_type": "image", "title": "A Galaxy", "date": "2026-11-12", "url": "https://apod.nasa.gov/apod/image/2611/x.jpg",
            "explanation": "Long text. " * 80, "copyright": "Some Person"}
    out = nasa.parse_apod(good)
    assert out["available"] and out["credit"] == "Image credit: Some Person" and len(out["summary"]) <= 270
    assert nasa.parse_apod({**good, "media_type": "video"}) == {"available": False}      # videos are skipped
    assert nasa.parse_apod({**good, "url": "http://insecure/x.jpg"}) == {"available": False}
    assert nasa.parse_apod({k: v for k, v in good.items() if k != "copyright"})["credit"] == "Image credit: NASA"

    # NASA down: the endpoint still answers 200 immediately and explains why
    _reset_nasa(nasa)
    monkeypatch.setattr(nasa, "fetch_apod", lambda key: {"available": False, "reason": "NASA returned HTTP 503"})
    monkeypatch.setattr(nasa, "fetch_library_picture", lambda: {"available": False, "reason": "library down"})
    r = client.get("/api/nasa/apod")
    assert r.status_code == 200 and r.json()["available"] is False
    if nasa._state["thread"] is not None:
        nasa._state["thread"].join(5)
    nasa._state["last_try"] = 0.0
    again = client.get("/api/nasa/apod").json()
    assert again["available"] is False and "503" in again["reason"]

    # NASA up: picture is served, then kept on disk and served even if NASA later fails
    _reset_nasa(nasa)
    monkeypatch.setattr(nasa, "fetch_apod", lambda key: out)
    client.get("/api/nasa/apod")
    if nasa._state["thread"] is not None:
        nasa._state["thread"].join(5)
    assert client.get("/api/nasa/apod").json()["title"] == "A Galaxy"
    assert (tmp_path / "nasa_cache.json").exists()
    nasa._state.update(good_at=0.0, last_try=0.0)                                          # make it stale
    monkeypatch.setattr(nasa, "fetch_apod", lambda key: {"available": False, "reason": "timeout"})
    monkeypatch.setattr(nasa, "fetch_library_picture", lambda: {"available": False, "reason": "library down"})
    assert client.get("/api/nasa/apod").json()["title"] == "A Galaxy"                      # stale picture still shown
    _reset_nasa(nasa)


def test_nasa_picks_newest_image_when_latest_is_video():
    from app.api import nasa
    img = lambda d, t: {"media_type": "image", "title": t, "date": d, "url": f"https://apod.nasa.gov/apod/image/{d}.jpg", "explanation": "Text."}
    items = [img("2026-11-10", "Old"), {"media_type": "video", "title": "Vid", "date": "2026-11-13", "url": "https://youtube.com/x"},
             img("2026-11-12", "Newest image")]
    assert nasa.pick_latest_image(items)["title"] == "Newest image"
    assert nasa.pick_latest_image([{"media_type": "video", "date": "2026-11-13", "url": "https://y"}])["available"] is False
    assert nasa.pick_latest_image("garbage")["available"] is False


def test_nasa_prefers_real_apod_photo_but_never_gives_up():
    from app.api import nasa
    other = {"media_type": "image", "title": "Other host", "date": "2026-11-13", "explanation": "x",
             "url": "https://images-assets.nasa.gov/image/pic/pic.jpg"}
    logo = {"media_type": "image", "title": "NASA Science", "date": "2026-11-14", "explanation": "x",
            "url": "https://www.nasa.gov/wp-content/uploads/nasa-logo-web.png"}
    photo = {"media_type": "image", "title": "Real photo", "date": "2026-11-12", "explanation": "x",
             "url": "https://apod.nasa.gov/apod/image/2611/pic.jpg"}
    assert nasa.pick_latest_image([logo, other, photo])["title"] == "Real photo"      # genuine APOD photo wins
    assert nasa.pick_latest_image([logo, other])["title"] == "Other host"            # logo skipped, other image used
    assert nasa.pick_latest_image([logo])["available"] is False and "usable image" in nasa.pick_latest_image([logo])["reason"]


def test_nasa_uses_hd_url_or_thumbnail_and_rejects_theme_assets():
    from app.api import nasa
    base = {"title": "T", "date": "2026-11-14", "explanation": "x"}
    promo = {**base, "media_type": "image", "url": "https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo.svg"}
    assert nasa.parse_apod(promo) == {"available": False}
    with_hd = {**promo, "hdurl": "https://apod.nasa.gov/apod/image/2611/real_big.jpg"}
    assert nasa.parse_apod(with_hd)["image_url"].endswith("real_big.jpg")                   # HD image used
    vid = {**base, "media_type": "video", "url": "https://youtube.com/embed/x", "thumbnail_url": "https://img.youtube.com/vi/x/0.jpg"}
    assert nasa.parse_apod(vid)["image_url"].endswith("0.jpg")                               # video thumbnail used
    assert nasa.parse_apod({**base, "media_type": "video", "url": "https://youtube.com/embed/x"}) == {"available": False}
    assert nasa.pick_latest_image([promo])["available"] is False


def test_nasa_image_library_parsing():
    from app.api import nasa
    item = {"data": [{"nasa_id": "PIA14417", "title": "Weighing in on the Dumbbell Nebula", "media_type": "image",
                      "center": "JPL", "date_created": "2011-09-01T00:00:00Z",
                      "description": "<p>The Dumbbell nebula, also known as Messier 27, pumps out infrared light.</p>"}],
            "links": [{"href": "https://images-assets.nasa.gov/image/PIA14417/PIA14417~medium.jpg", "render": "image"}]}
    out = nasa.parse_library_item(item)
    assert out["available"] and out["source"] == "NASA Image and Video Library"
    assert out["source_url"].endswith("PIA14417") and "<p>" not in out["summary"] and out["credit"] == "Image credit: NASA / JPL"
    item["data"][0]["photographer"] = "NASA/JPL"
    assert nasa.parse_library_item(item)["credit"] == "Image credit: NASA/JPL"
    assert nasa.parse_library_item({"data": [{"media_type": "video"}], "links": []}) == {"available": False}
    assert nasa.parse_library_item({}) == {"available": False}


def test_nasa_summary_strips_web_addresses():
    from app.api import nasa
    out = nasa._short("Four images of the Moon. http://photojournal.jpl.nasa.gov/catalog/PIA00231 More text here.")
    assert "http" not in out and "Four images of the Moon." in out
