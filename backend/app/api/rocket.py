from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.database import get_db
from app.game.rocket import PARTS, SLOTS, clean_components, validate_assembly
from app.models import Child, RocketBuild
from app.schemas import RocketIn
from app.services.progression import award_xp, evaluate_badges, reward_summary, total_xp, try_daily

router = APIRouter(tags=["Rocket Lab"])
ROCKET_XP = 150


def build_dict(b: RocketBuild) -> dict:
    return {"id": b.id, "name": b.name, "components": b.components, "body_color": b.body_color,
            "accent_color": b.accent_color, "is_valid": b.is_valid, "launched": b.launched,
            "launch_success": b.launch_success, "created_at": b.created_at}


@router.get("/api/rocket/parts", summary="Rocket parts catalogue")
def parts():
    return {"slots": SLOTS, "parts": PARTS, "launch_xp": ROCKET_XP}


@router.post("/api/children/{child_id}/rocket/validate", summary="Test the rocket assembly")
def validate(body: RocketIn, child: Child = Depends(get_owned_child)):
    return validate_assembly(clean_components(body.components))


@router.post("/api/children/{child_id}/rocket/builds", status_code=201, summary="Save a rocket design")
def save(body: RocketIn, child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    comps = clean_components(body.components)
    check = validate_assembly(comps)
    b = RocketBuild(child_id=child.id, name=body.name.strip(), components=comps, body_color=body.body_color,
                    accent_color=body.accent_color, is_valid=check["valid"])
    db.add(b)
    db.commit()
    return {"build": build_dict(b), "validation": check}


@router.get("/api/children/{child_id}/rocket/builds", summary="Saved rocket designs")
def list_builds(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    rows = db.scalars(select(RocketBuild).where(RocketBuild.child_id == child.id)
                      .order_by(desc(RocketBuild.id)).limit(20))
    return [build_dict(b) for b in rows]


@router.post("/api/children/{child_id}/rocket/launch", summary="Launch a rocket (validated server-side)")
def launch(body: RocketIn, child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    comps = clean_components(body.components)
    check = validate_assembly(comps)
    before = total_xp(db, child.id)
    b = RocketBuild(child_id=child.id, name=body.name.strip(), components=comps, body_color=body.body_color,
                    accent_color=body.accent_color, is_valid=check["valid"], launched=True,
                    launch_success=check["valid"])
    db.add(b)
    db.flush()
    xp = daily = 0
    badges = []
    if check["valid"]:
        xp = award_xp(db, child.id, "rocket", "rocket:first_launch", ROCKET_XP, "First successful rocket launch")
        daily = try_daily(db, child.id, "rocket")
        badges = evaluate_badges(db, child.id)
    db.commit()
    return {"success": check["valid"], "validation": check, "build": build_dict(b),
            **reward_summary(db, child, before, xp, badges, daily)}
