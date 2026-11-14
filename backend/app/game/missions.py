"""Mission game configurations and server-side result validation.

The frontend plays the games, but the backend owns the rules: it decides whether a
submission is a success, computes the score and (in services.progression) the XP.
Answer keys never leave the server.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any

ZERO_GRAVITY = "zero_gravity"
SPACE_NAVIGATION = "space_navigation"
EQUIPMENT_EXPERT = "equipment_expert"
MOON_LANDING = "moon_landing"
EMERGENCY_RESCUE = "emergency_rescue"
MISSION_CODES = [ZERO_GRAVITY, SPACE_NAVIGATION, EQUIPMENT_EXPERT, MOON_LANDING, EMERGENCY_RESCUE]


class MissionValidationError(ValueError):
    """Raised when a submission is malformed or implausible."""


@dataclass
class MissionResult:
    success: bool
    score: int
    feedback: str
    details: dict[str, Any] = field(default_factory=dict)


def _clamp(v: float, lo: int = 0, hi: int = 100) -> int:
    return int(max(lo, min(hi, round(v))))


# ---------------------------------------------------------------- Mission 1: Zero Gravity
ZERO_GRAVITY_CONFIG = {
    "world": {"width": 960, "height": 560},
    "start": {"x": 80, "y": 280},
    "station": {"x": 860, "y": 280, "radius": 60},
    "stars": [
        {"x": 240, "y": 110}, {"x": 330, "y": 440}, {"x": 520, "y": 250},
        {"x": 680, "y": 100}, {"x": 720, "y": 450},
    ],
    "obstacles": [
        {"x": 420, "y": 140, "r": 34, "vx": 0, "vy": 70},
        {"x": 600, "y": 380, "r": 30, "vx": 0, "vy": -90},
        {"x": 260, "y": 300, "r": 26, "vx": 60, "vy": 0},
        {"x": 790, "y": 220, "r": 28, "vx": 0, "vy": 80},
    ],
    "lives": 3,
    "thrust": 420,
    "drag": 0.6,
    "max_speed": 260,
}


def validate_zero_gravity(data: dict) -> MissionResult:
    try:
        stars = int(data.get("stars_collected", 0))
        reached = bool(data.get("reached_station", False))
        hits = int(data.get("hits", 0))
        duration = float(data.get("duration_seconds", 0))
    except (TypeError, ValueError):
        raise MissionValidationError("Invalid zero gravity result.")
    total = len(ZERO_GRAVITY_CONFIG["stars"])
    if not (0 <= stars <= total) or hits < 0 or hits > 10 or duration < 0 or duration > 3600:
        raise MissionValidationError("Zero gravity result is out of range.")
    if reached and duration < 6:  # impossible to cross the map that fast
        raise MissionValidationError("That was faster than light! Result rejected.")
    lives = ZERO_GRAVITY_CONFIG["lives"]
    success = stars == total and reached and hits < lives
    if success:
        score = _clamp(100 - hits * 15 - max(0.0, duration - 45) * 0.5, 40, 100)
        feedback = f"Amazing floating! You collected all {total} stars and docked at the space station."
    else:
        score = _clamp(stars * 10)
        if hits >= lives:
            feedback = "Ouch! Too many space rocks bumped you. Move gently — in space you keep drifting!"
        elif stars < total:
            feedback = f"You found {stars} of {total} stars. Collect them all, then fly to the station!"
        else:
            feedback = "So close! Now steer to the space station to finish."
    return MissionResult(success, score, feedback,
                         {"stars_collected": stars, "hits": hits, "duration_seconds": round(duration, 1)})


# ---------------------------------------------------------------- Mission 2: Space Navigation
NAV_LEVELS = [
    {
        "id": 1, "destination": "Mars", "color": "#E2734A", "cols": 7, "rows": 5,
        "start": [0, 2], "goal": [6, 2], "max_moves": 14,
        "asteroids": [[2, 1], [2, 2], [2, 3], [4, 2], [5, 0], [4, 4]],
        "hint": "Big asteroid wall ahead! Fly around it.",
    },
    {
        "id": 2, "destination": "Jupiter", "color": "#D9A066", "cols": 7, "rows": 5,
        "start": [0, 0], "goal": [6, 4], "max_moves": 14,
        "asteroids": [[1, 0], [1, 1], [3, 1], [3, 2], [3, 3], [5, 3], [5, 4], [2, 4]],
        "hint": "Look for the gap between the asteroids.",
    },
    {
        "id": 3, "destination": "Saturn", "color": "#E8CF8A", "cols": 7, "rows": 5,
        "start": [0, 4], "goal": [6, 0], "max_moves": 16,
        "asteroids": [[1, 3], [1, 2], [2, 0], [3, 2], [3, 3], [3, 4], [4, 0], [5, 1], [5, 2]],
        "hint": "This one is tricky. Plan your whole route before you launch!",
    },
]
_DIRS = {"U": (0, -1), "D": (0, 1), "L": (-1, 0), "R": (1, 0)}


def shortest_route_length(level: dict) -> int | None:
    blocked = {tuple(a) for a in level["asteroids"]}
    start, goal = tuple(level["start"]), tuple(level["goal"])
    seen = {start}
    q = deque([(start, 0)])
    while q:
        (x, y), d = q.popleft()
        if (x, y) == goal:
            return d
        for dx, dy in _DIRS.values():
            n = (x + dx, y + dy)
            if 0 <= n[0] < level["cols"] and 0 <= n[1] < level["rows"] and n not in blocked and n not in seen:
                seen.add(n)
                q.append((n, d + 1))
    return None


def simulate_route(level: dict, moves: list[str]) -> dict:
    blocked = {tuple(a) for a in level["asteroids"]}
    x, y = level["start"]
    path = [[x, y]]
    if len(moves) > level["max_moves"]:
        return {"reached": False, "reason": "out_of_fuel", "step": level["max_moves"], "path": path}
    for i, m in enumerate(moves, start=1):
        if m not in _DIRS:
            raise MissionValidationError("Unknown move.")
        dx, dy = _DIRS[m]
        x, y = x + dx, y + dy
        if not (0 <= x < level["cols"] and 0 <= y < level["rows"]):
            return {"reached": False, "reason": "off_map", "step": i, "path": path}
        path.append([x, y])
        if (x, y) in blocked:
            return {"reached": False, "reason": "asteroid", "step": i, "path": path}
        if [x, y] == level["goal"]:
            return {"reached": True, "reason": "arrived", "step": i, "path": path}
    return {"reached": False, "reason": "not_reached", "step": len(moves), "path": path}


NAV_MESSAGES = {
    "arrived": "Perfect landing at {dest}!",
    "asteroid": "Bonk! You hit an asteroid on move {step}. Try a different path.",
    "off_map": "Oops! On move {step} you flew off the star map.",
    "not_reached": "You ran out of moves before reaching {dest}. Add more steps!",
    "out_of_fuel": "That route is too long — your rocket only has fuel for {step} moves.",
}


def validate_navigation(data: dict) -> MissionResult:
    routes = data.get("routes")
    if not isinstance(routes, dict):
        raise MissionValidationError("Routes are missing.")
    levels_out, scores, all_ok = [], [], True
    for level in NAV_LEVELS:
        moves = routes.get(str(level["id"])) or routes.get(level["id"]) or []
        if not isinstance(moves, list) or len(moves) > 40:
            raise MissionValidationError("Invalid route.")
        sim = simulate_route(level, [str(m).upper() for m in moves])
        best = shortest_route_length(level) or 1
        if sim["reached"]:
            s = _clamp(100 - max(0, len(moves) - best) * 5, 50, 100)
        else:
            s, all_ok = 0, False
        scores.append(s)
        levels_out.append({
            "level_id": level["id"], "destination": level["destination"], "reached": sim["reached"],
            "reason": sim["reason"], "moves_used": len(moves), "best_possible": best, "score": s,
            "message": NAV_MESSAGES[sim["reason"]].format(dest=level["destination"], step=sim["step"]),
        })
    score = _clamp(sum(scores) / len(scores))
    feedback = ("Navigation expert! You found a safe path to every planet." if all_ok
                else "Some routes need fixing. Check the messages and try again!")
    return MissionResult(all_ok, score, feedback, {"levels": levels_out})


# ---------------------------------------------------------------- Mission 3: Equipment Expert
EQUIPMENT_CATEGORIES = [
    {"id": "protect", "title": "Protect My Body", "color": "#66CDEB",
     "description": "Gear that keeps astronauts safe from cold, heat, sunlight and sharp space dust."},
    {"id": "life", "title": "Keep Me Alive", "color": "#A8E6CF",
     "description": "Gear that gives air, water and a comfy temperature."},
    {"id": "work", "title": "Work & Talk", "color": "#FFCB69",
     "description": "Gear for fixing things, staying attached and talking to Mission Control."},
]
EQUIPMENT_ITEMS = [
    {"id": "helmet", "name": "Space Helmet", "icon": "helmet", "category": "protect",
     "purpose": "The helmet protects the astronaut's head. Its gold visor blocks the Sun's super-bright light."},
    {"id": "gloves", "name": "Space Gloves", "icon": "gloves", "category": "protect",
     "purpose": "Thick gloves keep fingers warm and safe, but still let astronauts grab tools."},
    {"id": "boots", "name": "Moon Boots", "icon": "boots", "category": "protect",
     "purpose": "Strong boots protect feet from sharp, dusty Moon rocks."},
    {"id": "oxygen_tank", "name": "Oxygen Tank", "icon": "oxygen", "category": "life",
     "purpose": "There is no air in space, so the oxygen tank gives astronauts fresh air to breathe."},
    {"id": "drink_bag", "name": "Drink Bag", "icon": "water", "category": "life",
     "purpose": "A drink bag inside the suit has a straw so astronauts can sip water on long spacewalks."},
    {"id": "cooling_suit", "name": "Cooling Undersuit", "icon": "cooling", "category": "life",
     "purpose": "Tiny tubes of cool water run through this undersuit to stop astronauts getting too hot."},
    {"id": "radio", "name": "Radio Headset", "icon": "radio", "category": "work",
     "purpose": "The radio headset lets astronauts talk to their crew and to Mission Control on Earth."},
    {"id": "tether", "name": "Safety Tether", "icon": "tether", "category": "work",
     "purpose": "A strong cord clips the astronaut to the spacecraft so they never float away."},
    {"id": "space_drill", "name": "Space Drill", "icon": "drill", "category": "work",
     "purpose": "A special battery drill helps astronauts fix and build things outside the space station."},
]
_EQUIP_KEY = {i["id"]: i["category"] for i in EQUIPMENT_ITEMS}


def check_equipment(item_id: str, category_id: str) -> dict:
    if item_id not in _EQUIP_KEY:
        raise MissionValidationError("Unknown equipment item.")
    item = next(i for i in EQUIPMENT_ITEMS if i["id"] == item_id)
    correct = _EQUIP_KEY[item_id] == category_id
    cat_title = next((c["title"] for c in EQUIPMENT_CATEGORIES if c["id"] == _EQUIP_KEY[item_id]), "")
    return {
        "correct": correct,
        "explanation": item["purpose"] if correct
        else f"Hmm, not quite! Think about what the {item['name']} does. Hint: it belongs in “{cat_title}”.",
    }


def validate_equipment(data: dict) -> MissionResult:
    placements = data.get("placements")
    if not isinstance(placements, dict):
        raise MissionValidationError("Placements are missing.")
    try:
        mistakes = int(data.get("mistakes", 0))
    except (TypeError, ValueError):
        raise MissionValidationError("Invalid mistakes value.")
    mistakes = max(0, min(mistakes, 50))
    correct = sum(1 for k, v in _EQUIP_KEY.items() if placements.get(k) == v)
    total = len(_EQUIP_KEY)
    success = correct == total
    score = _clamp(100 - mistakes * 8, 30, 100) if success else _clamp(correct / total * 60)
    feedback = ("You are a Space Equipment Expert! Every item is in the right place." if success
                else f"You sorted {correct} of {total} items correctly. Keep trying!")
    return MissionResult(success, score, feedback, {"correct": correct, "total": total, "mistakes": mistakes})


# ---------------------------------------------------------------- Mission 4: Moon Landing
MOON_CONFIG = {
    "world": {"width": 900, "height": 520},
    "ground_y": 460,
    "lander": {"x": 450, "y": 60, "vx": 18, "vy": 0, "half_width": 22},
    "gravity": 16.2,           # pixels/s^2 (1 px = 0.1 m => Moon gravity 1.62 m/s^2)
    "main_thrust": 34.0,
    "side_thrust": 14.0,
    "fuel": 100,
    "fuel_burn_main": 9.0,     # per second
    "fuel_burn_side": 4.0,
    "safe_vertical_speed": 2.5,   # m/s (pixels/s / 10)
    "safe_horizontal_speed": 1.5,
    "zones": [
        {"x0": 0, "x1": 110, "type": "rocks", "label": "Boulder Field"},
        {"x0": 110, "x1": 250, "type": "safe", "label": "Landing Pad A"},
        {"x0": 250, "x1": 420, "type": "crater", "label": "Deep Crater"},
        {"x0": 420, "x1": 520, "type": "rocks", "label": "Rocky Hill"},
        {"x0": 520, "x1": 680, "type": "safe", "label": "Landing Pad B"},
        {"x0": 680, "x1": 900, "type": "crater", "label": "Shadow Crater"},
    ],
}


def validate_moon_landing(data: dict) -> MissionResult:
    try:
        x = float(data["landing_x"])
        vs = abs(float(data["vertical_speed"]))
        hs = abs(float(data["horizontal_speed"]))
        fuel = float(data.get("fuel_left", 0))
        duration = float(data.get("duration_seconds", 0))
    except (KeyError, TypeError, ValueError):
        raise MissionValidationError("Invalid landing data.")
    w = MOON_CONFIG["world"]["width"]
    if not (0 <= x <= w) or not (0 <= fuel <= MOON_CONFIG["fuel"]) or vs > 500 or hs > 500 or duration < 0:
        raise MissionValidationError("Landing data is out of range.")
    if duration < 3:
        raise MissionValidationError("Landing happened impossibly fast. Result rejected.")
    half = MOON_CONFIG["lander"]["half_width"]
    zone = next((z for z in MOON_CONFIG["zones"] if z["x0"] <= x < z["x1"]), MOON_CONFIG["zones"][-1])
    on_pad = zone["type"] == "safe" and x - half >= zone["x0"] and x + half <= zone["x1"]
    slow = vs <= MOON_CONFIG["safe_vertical_speed"]
    straight = hs <= MOON_CONFIG["safe_horizontal_speed"]
    success = on_pad and slow and straight
    if success:
        score = _clamp(55 + fuel * 0.3 + (MOON_CONFIG["safe_vertical_speed"] - vs) * 6)
        feedback = f"The Eagle has landed! A soft, safe touchdown on {zone['label']}."
    else:
        score = _clamp(10 + (20 if on_pad else 0) + (10 if slow else 0))
        if not on_pad:
            feedback = f"You landed in the {zone['label']}. Aim for a green landing pad!"
        elif not slow:
            feedback = f"Too fast! You touched down at {vs:.1f} m/s. Use the thruster to slow below {MOON_CONFIG['safe_vertical_speed']} m/s."
        else:
            feedback = "You were sliding sideways. Use the side thrusters to stop drifting before touchdown."
    return MissionResult(success, score, feedback, {
        "zone": zone["label"], "on_pad": on_pad, "vertical_speed": round(vs, 2),
        "horizontal_speed": round(hs, 2), "fuel_left": round(fuel, 1),
    })


# ---------------------------------------------------------------- Mission 5: Emergency Rescue
EMERGENCY_SCENARIOS = [
    {
        "id": "smoke", "title": "Smoke Alarm!", "icon": "alarm",
        "story": "Beep beep! The smoke alarm on the space station is flashing. You smell something burning.",
        "options": [
            {"id": "a", "text": "Open the hatch to let the smoke float out into space."},
            {"id": "b", "text": "Warn the crew, put on your breathing mask and follow the fire checklist."},
            {"id": "c", "text": "Hide in your sleeping bag until it stops."},
        ],
        "correct": "b",
        "explanation": "Astronauts always warn each other first, wear masks so they can breathe clean air, "
                       "and follow a checklist with Mission Control. Opening a hatch to space would be very dangerous!",
    },
    {
        "id": "leak", "title": "Tiny Air Leak", "icon": "gauge",
        "story": "The air pressure gauge is slowly going down. There might be a tiny hole letting air escape.",
        "options": [
            {"id": "a", "text": "Tell everyone, go to a safe module, close the hatch and find the leak with Mission Control."},
            {"id": "b", "text": "Keep playing — it's only a small leak."},
            {"id": "c", "text": "Blow up balloons to make more air."},
        ],
        "correct": "a",
        "explanation": "Closing hatches keeps the air safe in the other rooms. Then the crew works with "
                       "Mission Control to find and patch the leak, step by step.",
    },
    {
        "id": "tether", "title": "Loose Tether", "icon": "tether",
        "story": "You are on a spacewalk outside the station. Your safety tether just came unclipped!",
        "options": [
            {"id": "a", "text": "Quickly jump to the next handrail."},
            {"id": "b", "text": "Let go and float — it will be fun!"},
            {"id": "c", "text": "Stop, hold the handrail tightly and clip your tether back on before moving."},
        ],
        "correct": "c",
        "explanation": "In space, a little push sends you drifting away. Astronauts follow the rule: "
                       "always stay connected — hold on, then clip back in before moving again.",
    },
    {
        "id": "debris", "title": "Space Junk Warning", "icon": "debris",
        "story": "Mission Control radios: “A piece of space junk will pass close to the station in one hour!”",
        "options": [
            {"id": "a", "text": "Go outside to take a photo of it."},
            {"id": "b", "text": "Get into the spaceship that can take you home and wait for the all-clear."},
            {"id": "c", "text": "Throw things at it to push it away."},
        ],
        "correct": "b",
        "explanation": "When space junk comes close, the crew shelters in their return spaceship. "
                       "If anything went wrong, they could fly home safely.",
    },
]
_EMERGENCY_KEY = {s["id"]: s for s in EMERGENCY_SCENARIOS}
EMERGENCY_PASS = 3


def check_emergency(scenario_id: str, option_id: str) -> dict:
    s = _EMERGENCY_KEY.get(scenario_id)
    if s is None or option_id not in {o["id"] for o in s["options"]}:
        raise MissionValidationError("Unknown scenario or option.")
    return {"correct": s["correct"] == option_id, "correct_option": s["correct"], "explanation": s["explanation"]}


def validate_emergency(data: dict) -> MissionResult:
    answers = data.get("answers")
    if not isinstance(answers, dict):
        raise MissionValidationError("Answers are missing.")
    review, correct = [], 0
    for s in EMERGENCY_SCENARIOS:
        picked = answers.get(s["id"])
        ok = picked == s["correct"]
        correct += ok
        review.append({"scenario_id": s["id"], "picked": picked, "correct": ok,
                       "correct_option": s["correct"], "explanation": s["explanation"]})
    total = len(EMERGENCY_SCENARIOS)
    success = correct >= EMERGENCY_PASS
    score = _clamp(correct / total * 100)
    feedback = (f"Calm and clever! You chose {correct} of {total} safe actions. The crew is safe!" if success
                else f"You chose {correct} of {total} safe actions. Read the explanations and try again!")
    return MissionResult(success, score, feedback, {"correct": correct, "total": total, "review": review})


VALIDATORS = {
    ZERO_GRAVITY: validate_zero_gravity,
    SPACE_NAVIGATION: validate_navigation,
    EQUIPMENT_EXPERT: validate_equipment,
    MOON_LANDING: validate_moon_landing,
    EMERGENCY_RESCUE: validate_emergency,
}


def public_config(code: str) -> dict:
    """Game configuration sent to the browser (no answer keys)."""
    if code == ZERO_GRAVITY:
        return ZERO_GRAVITY_CONFIG
    if code == SPACE_NAVIGATION:
        return {"levels": NAV_LEVELS}
    if code == EQUIPMENT_EXPERT:
        return {"categories": EQUIPMENT_CATEGORIES,
                "items": [{k: v for k, v in i.items() if k not in ("category", "purpose")} for i in EQUIPMENT_ITEMS]}
    if code == MOON_LANDING:
        return MOON_CONFIG
    if code == EMERGENCY_RESCUE:
        return {"pass_mark": EMERGENCY_PASS,
                "scenarios": [{k: v for k, v in s.items() if k not in ("correct", "explanation")}
                              for s in EMERGENCY_SCENARIOS]}
    return {}
