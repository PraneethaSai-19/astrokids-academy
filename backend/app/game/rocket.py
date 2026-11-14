"""Rocket Lab parts catalogue and assembly validation (simplified educational model)."""
import re

SLOTS = ["nose", "body", "fuel", "engine", "fins"]

PARTS = [
    {"id": "nose_cone", "name": "Nose Cone", "slot": "nose", "essential": True, "order": 1,
     "description": "The pointy top of the rocket. Its shape lets the rocket slice through the air "
                    "smoothly, like the tip of an arrow."},
    {"id": "body_tube", "name": "Rocket Body", "slot": "body", "essential": True, "order": 2,
     "description": "The strong main tube holds everything together. Real rockets carry astronauts or "
                    "satellites up here."},
    {"id": "fuel_tank", "name": "Fuel Tank", "slot": "fuel", "essential": True, "order": 3,
     "description": "Stores the fuel and oxygen the engine burns. Rockets need lots of it — most of a "
                    "rocket's weight is fuel!"},
    {"id": "engine", "name": "Engine", "slot": "engine", "essential": True, "order": 4,
     "description": "Burns fuel and blasts hot gas downward. Pushing gas down pushes the rocket up — "
                    "that's Newton's third law!"},
    {"id": "fins", "name": "Fins", "slot": "fins", "essential": True, "order": 5,
     "description": "Fins at the bottom keep the rocket flying straight instead of spinning or wobbling."},
    {"id": "wheels", "name": "Wheels", "slot": "extra", "essential": False, "order": 6,
     "description": "Wheels are great for cars, but rockets launch straight up, so they don't need them!"},
    {"id": "propeller", "name": "Propeller", "slot": "extra", "essential": False, "order": 7,
     "description": "Propellers push against air. Space has no air, so a propeller would not work up there!"},
]
PART_BY_ID = {p["id"]: p for p in PARTS}
EXPECTED = {p["slot"]: p["id"] for p in PARTS if p["essential"]}
SLOT_NAMES = {"nose": "nose cone", "body": "rocket body", "fuel": "fuel tank", "engine": "engine", "fins": "fins"}
HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")


def validate_assembly(components: dict) -> dict:
    """Returns {valid, issues[], checklist[]} for a components mapping {slot: part_id, extras: [...]}."""
    issues = []
    checklist = []
    for slot in SLOTS:
        part_id = components.get(slot)
        expected = EXPECTED[slot]
        ok = part_id == expected
        if part_id is None:
            issues.append({"slot": slot, "type": "missing",
                           "message": f"Your rocket is missing the {SLOT_NAMES[slot]}! "
                                      + PART_BY_ID[expected]["description"]})
        elif not ok:
            issues.append({"slot": slot, "type": "wrong_part",
                           "message": f"That part doesn't belong in the {SLOT_NAMES[slot]} spot."})
        checklist.append({"slot": slot, "label": SLOT_NAMES[slot].title(), "ok": ok})
    extras = components.get("extras") or []
    if not isinstance(extras, list):
        extras = []
    for part_id in extras:
        part = PART_BY_ID.get(part_id)
        if part and not part["essential"]:
            issues.append({"slot": "extra", "type": "not_needed", "message": part["description"]})
    return {"valid": not issues, "issues": issues, "checklist": checklist}


def clean_components(components: dict) -> dict:
    out = {}
    for slot in SLOTS:
        v = components.get(slot)
        if v is not None and v in PART_BY_ID:
            out[slot] = v
    extras = components.get("extras") or []
    out["extras"] = [e for e in extras if isinstance(e, str) and e in PART_BY_ID][:5]
    return out
