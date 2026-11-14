from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.database import get_db, utcnow
from app.game import missions as rules
from app.models import Child, Mission, MissionAttempt, MissionProgress
from app.schemas import MissionCheck, MissionSubmit
from app.services.progression import award_xp, evaluate_badges, reward_summary, total_xp, try_daily

router = APIRouter(tags=["Missions"])


def mission_dict(m: Mission, with_config: bool = False) -> dict:
    d = {c: getattr(m, c) for c in ("id", "code", "title", "short_description", "instructions",
                                     "learning_goal", "xp_reward", "difficulty", "order_index", "color")}
    if with_config:
        d["config"] = rules.public_config(m.code)
    return d


def _mission(db: Session, code: str) -> Mission:
    m = db.scalar(select(Mission).where(Mission.code == code))
    if m is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mission not found.")
    return m


@router.get("/api/missions", summary="List training missions")
def list_missions(db: Session = Depends(get_db)):
    return [mission_dict(m) for m in db.scalars(select(Mission).order_by(Mission.order_index))]


@router.get("/api/missions/{code}", summary="Mission details and game configuration")
def get_mission(code: str, db: Session = Depends(get_db)):
    return mission_dict(_mission(db, code), with_config=True)


@router.get("/api/children/{child_id}/missions/progress", summary="Mission progress for a child")
def progress(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    rows = {p.mission_id: p for p in db.scalars(select(MissionProgress).where(MissionProgress.child_id == child.id))}
    out = []
    for m in db.scalars(select(Mission).order_by(Mission.order_index)):
        p = rows.get(m.id)
        out.append({"code": m.code, "title": m.title, "xp_reward": m.xp_reward,
                    "attempts": p.attempts if p else 0, "best_score": p.best_score if p else 0,
                    "completed": bool(p and p.completed), "xp_awarded": p.xp_awarded if p else 0,
                    "first_completed_at": p.first_completed_at if p else None})
    return out


@router.get("/api/children/{child_id}/missions/history", summary="Mission attempt history")
def history(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    rows = db.scalars(select(MissionAttempt).where(MissionAttempt.child_id == child.id)
                      .order_by(desc(MissionAttempt.created_at), desc(MissionAttempt.id)).limit(50))
    return [{"id": a.id, "mission_code": a.mission.code, "mission_title": a.mission.title,
             "success": a.success, "score": a.score, "xp_earned": a.xp_earned, "created_at": a.created_at}
            for a in rows]


@router.post("/api/children/{child_id}/missions/{code}/check",
             summary="Instant feedback for one step (equipment item or emergency answer). Gives no XP.")
def check_step(code: str, body: MissionCheck, child: Child = Depends(get_owned_child),
               db: Session = Depends(get_db)):
    _mission(db, code)
    try:
        if code == rules.EQUIPMENT_EXPERT and body.item_id and body.category_id:
            return rules.check_equipment(body.item_id, body.category_id)
        if code == rules.EMERGENCY_RESCUE and body.scenario_id and body.option_id:
            return rules.check_emergency(body.scenario_id, body.option_id)
    except rules.MissionValidationError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This mission has no step checks.")


@router.post("/api/children/{child_id}/missions/{code}/complete",
             summary="Submit a mission result. The server validates it and awards XP (first success only).")
def complete(code: str, body: MissionSubmit, child: Child = Depends(get_owned_child),
             db: Session = Depends(get_db)):
    mission = _mission(db, code)
    validator = rules.VALIDATORS.get(code)
    if validator is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Mission rules not found.")
    try:
        result = validator(body.result)
    except rules.MissionValidationError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    before = total_xp(db, child.id)
    prog = db.scalar(select(MissionProgress).where(MissionProgress.child_id == child.id,
                                                   MissionProgress.mission_id == mission.id))
    if prog is None:
        prog = MissionProgress(child_id=child.id, mission_id=mission.id, attempts=0, best_score=0,
                               completed=False, xp_awarded=0)
        db.add(prog)
    prog.attempts += 1
    first_completion = False
    xp = 0
    if result.success:
        prog.best_score = max(prog.best_score, result.score)
        if not prog.completed:
            prog.completed = True
            prog.first_completed_at = utcnow()
            first_completion = True
        xp = award_xp(db, child.id, "mission", f"mission:{code}", mission.xp_reward,
                      f"Completed {mission.title}")
        prog.xp_awarded += xp
    db.add(MissionAttempt(child_id=child.id, mission_id=mission.id, success=result.success,
                          score=result.score, xp_earned=xp, details=result.details))
    db.flush()
    daily = try_daily(db, child.id, "mission", code) if result.success else 0
    badges = evaluate_badges(db, child.id) if result.success else []
    db.commit()
    return {
        "mission": code, "success": result.success, "score": result.score, "best_score": prog.best_score,
        "feedback": result.feedback, "details": result.details, "first_completion": first_completion,
        "already_rewarded": result.success and xp == 0,
        **reward_summary(db, child, before, xp, badges, daily),
    }
