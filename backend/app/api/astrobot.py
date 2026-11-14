from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.demo_answers import SUGGESTIONS
from app.ai.provider import generate_answer, provider_status
from app.ai.safety import check_input, check_output
from app.api.deps import get_owned_child
from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.database import get_db
from app.models import AIMessage, AISession, Child
from app.schemas import ChatRequest
from app.services.progression import try_daily

router = APIRouter(tags=["AstroBot AI"])


@router.get("/api/astrobot/status", summary="Whether AstroBot is in live AI or curated demo mode")
def status_(settings=Depends(get_settings)):
    return {**provider_status(settings), "suggestions": SUGGESTIONS}


@router.get("/api/children/{child_id}/astrobot/usage", summary="Today's AstroBot usage for a child")
def usage(child: Child = Depends(get_owned_child), db: Session = Depends(get_db), settings=Depends(get_settings)):
    s = db.scalar(select(AISession).where(AISession.child_id == child.id, AISession.session_date == date.today()))
    used = s.message_count if s else 0
    st = provider_status(settings)
    if not child.ai_live_allowed:
        st = {"mode": "demo", "provider": "demo", "model": None}
    return {"enabled": child.ai_enabled, "used_today": used, "daily_limit": child.ai_daily_limit,
            "remaining": max(0, child.ai_daily_limit - used), **st}


@router.post("/api/children/{child_id}/astrobot/chat", summary="Ask AstroBot a question")
async def chat(body: ChatRequest, child: Child = Depends(get_owned_child), db: Session = Depends(get_db),
               settings=Depends(get_settings)):
    if not child.ai_enabled:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            detail="AstroBot is resting right now. Ask your grown-up to turn AstroBot on.")
    limiter.check(f"ai:{child.id}", settings.rate_limit_ai_per_minute)

    today = date.today()
    session = db.scalar(select(AISession).where(AISession.child_id == child.id, AISession.session_date == today))
    if session is None:
        session = AISession(child_id=child.id, session_date=today, message_count=0, demo_count=0, blocked_count=0)
        db.add(session)
        db.flush()
    if session.message_count >= child.ai_daily_limit:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="AstroBot needs to recharge! You've asked all your questions for today. "
                                   "Come back tomorrow for more space chats.")

    message = " ".join(body.message.split())
    category, canned = check_input(message)
    session.message_count += 1
    if canned:
        session.blocked_count += 1
        db.add(AIMessage(session_id=session.id, role="child",
                         content="[hidden for privacy/safety]" if category == "personal" else message[:300],
                         mode="safety", flagged=True))
        db.add(AIMessage(session_id=session.id, role="bot", content=canned, mode="safety"))
        db.commit()
        return {"answer": canned, "mode": "safety", "safety": category,
                "remaining": max(0, child.ai_daily_limit - session.message_count)}

    history = [h.model_dump() for h in body.history]
    result = await generate_answer(settings, message, history, allow_live=child.ai_live_allowed)
    answer = check_output(result["answer"])
    if result["mode"] == "demo":
        session.demo_count += 1
    db.add(AIMessage(session_id=session.id, role="child", content=message[:300], mode=result["mode"]))
    db.add(AIMessage(session_id=session.id, role="bot", content=answer[:2000], mode=result["mode"]))
    daily = try_daily(db, child.id, "astrobot")
    db.commit()
    return {"answer": answer, "mode": result["mode"], "matched_question": result.get("matched_question"),
            "notice": result.get("notice"), "daily_bonus": daily,
            "remaining": max(0, child.ai_daily_limit - session.message_count)}
