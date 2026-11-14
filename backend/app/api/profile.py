from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.database import get_db, utcnow
from app.game.levels import LEVELS, level_info
from app.models import (AstronautProfile, Child, ChildSession, EarnedBadge, Mission, MissionProgress,
                        PlanetVisit, RocketBuild, XPEvent)
from app.schemas import AvatarIn
from app.services.children import avatar_dict, child_summary
from app.services.progression import daily_status, total_xp

router = APIRouter(prefix="/api/children/{child_id}", tags=["Profile & progress"])


@router.get("/profile", summary="Astronaut profile, avatar, XP, level and stats")
def get_profile(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    summary = child_summary(db, child)
    missions_total = db.scalar(select(func.count(Mission.id))) or 0
    completed = db.scalar(select(func.count(MissionProgress.id)).where(
        MissionProgress.child_id == child.id, MissionProgress.completed.is_(True))) or 0
    summary["stats"] = {
        "missions_completed": completed,
        "missions_total": missions_total,
        "badges_earned": db.scalar(select(func.count(EarnedBadge.id)).where(EarnedBadge.child_id == child.id)) or 0,
        "planets_explored": db.scalar(select(func.count(PlanetVisit.id)).where(PlanetVisit.child_id == child.id)) or 0,
        "rockets_launched": db.scalar(select(func.count(RocketBuild.id)).where(
            RocketBuild.child_id == child.id, RocketBuild.launch_success.is_(True))) or 0,
    }
    summary["levels"] = LEVELS
    summary["daily"] = daily_status(db, child.id)
    return summary


@router.put("/avatar", summary="Create or update the astronaut avatar")
def update_avatar(body: AvatarIn, child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    profile = child.profile
    if profile is None:
        profile = AstronautProfile(child_id=child.id)
        db.add(profile)
    for k, v in body.model_dump().items():
        setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return {"avatar": avatar_dict(profile), "message": "Looking stellar, astronaut!"}


@router.get("/xp", summary="Total XP and level")
def get_xp(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    return level_info(total_xp(db, child.id))


@router.get("/xp-history", summary="XP history (ledger)")
def xp_history(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    rows = db.scalars(select(XPEvent).where(XPEvent.child_id == child.id)
                      .order_by(desc(XPEvent.created_at), desc(XPEvent.id)).limit(100))
    return [{"id": r.id, "source": r.source, "amount": r.amount, "description": r.description,
             "created_at": r.created_at} for r in rows]


@router.get("/daily", summary="Today's daily challenge")
def daily(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    return daily_status(db, child.id)


@router.post("/session", summary="Record that the child started a play session")
def start_session(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    now = utcnow()
    last = db.scalar(select(ChildSession).where(ChildSession.child_id == child.id)
                     .order_by(desc(ChildSession.id)).limit(1))
    # Re-use a session that was active within the last 30 minutes
    if last and (now - last.last_active_at).total_seconds() < 1800:
        last.last_active_at = now
    else:
        db.add(ChildSession(child_id=child.id, started_at=now, last_active_at=now))
    db.commit()
    return {"ok": True}
