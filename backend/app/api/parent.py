"""Parent dashboard. Every route needs the short-lived parent-gate token (password re-entered)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_gated_child, get_gated_parent
from app.core.security import hash_password, verify_password
from app.database import get_db
from app.models import (AIMessage, AISession, Child, ChildSession, Mission, MissionAttempt,
                        MissionProgress, Parent, PlanetVisit, Quiz, QuizAttempt, EarnedBadge)
from app.schemas import AccountUpdate, ChangePassword, ChildSettingsIn
from app.services.children import child_summary

router = APIRouter(prefix="/api/parent", tags=["Parent dashboard"])


@router.get("/overview", summary="All children with summary progress")
def overview(parent: Parent = Depends(get_gated_parent), db: Session = Depends(get_db)):
    out = []
    for c in parent.children:
        s = child_summary(db, c)
        s["missions_completed"] = db.scalar(select(func.count(MissionProgress.id)).where(
            MissionProgress.child_id == c.id, MissionProgress.completed.is_(True))) or 0
        s["badges"] = db.scalar(select(func.count(EarnedBadge.id)).where(EarnedBadge.child_id == c.id)) or 0
        s["settings"] = {"ai_enabled": c.ai_enabled, "ai_live_allowed": c.ai_live_allowed,
                         "ai_daily_limit": c.ai_daily_limit}
        out.append(s)
    return {"parent": {"email": parent.email, "display_name": parent.display_name}, "children": out}


@router.get("/children/{child_id}/report", summary="Detailed learning report for one child")
def report(child: Child = Depends(get_gated_child), db: Session = Depends(get_db)):
    progress = []
    prog = {p.mission_id: p for p in db.scalars(select(MissionProgress).where(MissionProgress.child_id == child.id))}
    for m in db.scalars(select(Mission).order_by(Mission.order_index)):
        p = prog.get(m.id)
        progress.append({"title": m.title, "code": m.code, "completed": bool(p and p.completed),
                         "attempts": p.attempts if p else 0, "best_score": p.best_score if p else 0,
                         "first_completed_at": p.first_completed_at if p else None})
    quizzes = []
    for q in db.scalars(select(Quiz).order_by(Quiz.id)):
        attempts = list(db.scalars(select(QuizAttempt).where(QuizAttempt.child_id == child.id,
                                                             QuizAttempt.quiz_id == q.id)
                                   .order_by(QuizAttempt.id)))
        quizzes.append({"title": q.title, "attempts": len(attempts),
                        "best_percent": max((a.percent for a in attempts), default=None),
                        "last_percent": attempts[-1].percent if attempts else None,
                        "history": [{"percent": a.percent, "created_at": a.created_at} for a in attempts[-10:]]})
    sessions = [{"started_at": s.started_at, "last_active_at": s.last_active_at,
                 "minutes": max(1, round((s.last_active_at - s.started_at).total_seconds() / 60))}
                for s in db.scalars(select(ChildSession).where(ChildSession.child_id == child.id)
                                    .order_by(desc(ChildSession.id)).limit(20))]
    attempts = [{"mission": a.mission.title, "success": a.success, "score": a.score, "xp": a.xp_earned,
                 "created_at": a.created_at}
                for a in db.scalars(select(MissionAttempt).where(MissionAttempt.child_id == child.id)
                                    .order_by(desc(MissionAttempt.id)).limit(20))]
    ai_days = [{"date": s.session_date, "messages": s.message_count, "demo": s.demo_count,
                "blocked": s.blocked_count}
               for s in db.scalars(select(AISession).where(AISession.child_id == child.id)
                                   .order_by(desc(AISession.session_date)).limit(14))]
    recent_q = [{"question": m.content, "flagged": m.flagged, "created_at": m.created_at}
                for m in db.scalars(select(AIMessage).join(AISession)
                                    .where(AISession.child_id == child.id, AIMessage.role == "child")
                                    .order_by(desc(AIMessage.id)).limit(15))]
    planets = db.scalar(select(func.count(PlanetVisit.id)).where(PlanetVisit.child_id == child.id)) or 0
    return {"child": child_summary(db, child), "missions": progress, "quizzes": quizzes, "sessions": sessions,
            "recent_attempts": attempts, "planets_explored": planets,
            "ai": {"settings": {"ai_enabled": child.ai_enabled, "ai_live_allowed": child.ai_live_allowed,
                                "ai_daily_limit": child.ai_daily_limit},
                   "days": ai_days, "recent_questions": recent_q}}


@router.put("/children/{child_id}/settings", summary="Update AI controls and profile settings")
def update_settings(body: ChildSettingsIn, child: Child = Depends(get_gated_child), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_none=True)
    if "nickname" in data:
        nick = " ".join(data["nickname"].split())
        clash = db.scalar(select(Child.id).where(Child.parent_id == child.parent_id, Child.id != child.id,
                                                 func.lower(Child.nickname) == nick.lower()))
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, detail="Another astronaut already uses that nickname.")
        data["nickname"] = nick
    for k, v in data.items():
        setattr(child, k, v)
    db.commit()
    return {"ai_enabled": child.ai_enabled, "ai_live_allowed": child.ai_live_allowed,
            "ai_daily_limit": child.ai_daily_limit, "age_group": child.age_group, "nickname": child.nickname}


@router.delete("/children/{child_id}/ai-history", summary="Delete stored AstroBot conversations")
def clear_ai(child: Child = Depends(get_gated_child), db: Session = Depends(get_db)):
    ids = list(db.scalars(select(AISession.id).where(AISession.child_id == child.id)))
    if ids:
        db.query(AIMessage).filter(AIMessage.session_id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": "AstroBot conversation history deleted."}


@router.delete("/children/{child_id}", summary="Delete a child profile and all of its data")
def delete_child(child: Child = Depends(get_gated_child), db: Session = Depends(get_db)):
    db.delete(child)
    db.commit()
    return {"message": "Astronaut profile and all progress deleted."}


@router.get("/account", summary="Parent account details")
def account(parent: Parent = Depends(get_gated_parent)):
    return {"email": parent.email, "display_name": parent.display_name, "created_at": parent.created_at,
            "last_login_at": parent.last_login_at, "children": len(parent.children)}


@router.put("/account", summary="Update parent display name")
def update_account(body: AccountUpdate, parent: Parent = Depends(get_gated_parent), db: Session = Depends(get_db)):
    parent.display_name = body.display_name.strip()
    db.commit()
    return {"display_name": parent.display_name}


@router.post("/change-password", summary="Change password (logs out all other sessions)")
def change_password(body: ChangePassword, parent: Parent = Depends(get_gated_parent), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, parent.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Current password is not correct.")
    parent.password_hash = hash_password(body.new_password)
    parent.token_version += 1
    db.commit()
    return {"message": "Password changed. Please log in again."}
