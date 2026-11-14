"""Astronaut levels and daily challenges."""
from datetime import date

LEVELS = [
    {"level": 1, "name": "Space Cadet", "xp": 0},
    {"level": 2, "name": "Junior Explorer", "xp": 200},
    {"level": 3, "name": "Junior Astronaut", "xp": 500},
    {"level": 4, "name": "Space Scientist", "xp": 900},
    {"level": 5, "name": "Mission Commander", "xp": 1400},
    {"level": 6, "name": "Galaxy Explorer", "xp": 2000},
]


def level_info(total_xp: int) -> dict:
    total_xp = max(0, int(total_xp))
    current = LEVELS[0]
    for lvl in LEVELS:
        if total_xp >= lvl["xp"]:
            current = lvl
    idx = LEVELS.index(current)
    nxt = LEVELS[idx + 1] if idx + 1 < len(LEVELS) else None
    if nxt:
        span = nxt["xp"] - current["xp"]
        progress = round((total_xp - current["xp"]) / span * 100)
    else:
        progress = 100
    return {
        "level": current["level"],
        "level_name": current["name"],
        "total_xp": total_xp,
        "current_level_xp": current["xp"],
        "next_level_xp": nxt["xp"] if nxt else None,
        "next_level_name": nxt["name"] if nxt else None,
        "xp_to_next": (nxt["xp"] - total_xp) if nxt else 0,
        "progress_percent": max(0, min(100, progress)),
    }


DAILY_BONUS_XP = 50
DAILY_CHALLENGES = [
    {"type": "mission", "target": "zero_gravity", "title": "Float Like a Pro",
     "description": "Complete the Zero Gravity Challenge today."},
    {"type": "planet", "target": None, "title": "Planet Hopper",
     "description": "Explore any planet in the 3D Solar System."},
    {"type": "mission", "target": "space_navigation", "title": "Star Navigator",
     "description": "Guide your rocket safely in Space Navigation."},
    {"type": "quiz", "target": None, "title": "Brain Booster",
     "description": "Finish a space quiz with at least half the answers right."},
    {"type": "mission", "target": "equipment_expert", "title": "Gear Check",
     "description": "Sort all the gear in Space Equipment Expert."},
    {"type": "rocket", "target": None, "title": "Rocket Engineer",
     "description": "Build and launch a rocket in the Rocket Lab."},
    {"type": "mission", "target": "moon_landing", "title": "Soft Touchdown",
     "description": "Land safely in the Moon Landing mission."},
    {"type": "astrobot", "target": None, "title": "Curious Cadet",
     "description": "Ask AstroBot a space question."},
    {"type": "mission", "target": "emergency_rescue", "title": "Safety First",
     "description": "Pass the Space Emergency Rescue mission."},
]


def daily_challenge_for(child_id: int, day: date) -> dict:
    c = DAILY_CHALLENGES[(day.toordinal() + child_id) % len(DAILY_CHALLENGES)]
    return {**c, "date": day.isoformat(), "xp_bonus": DAILY_BONUS_XP}
