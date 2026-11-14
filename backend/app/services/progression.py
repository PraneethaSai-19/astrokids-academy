"""XP ledger, levels, badges and daily challenges. All rewards are decided here, server-side."""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.game.levels import DAILY_BONUS_XP, daily_challenge_for, level_info
from app.game.missions import (EQUIPMENT_EXPERT, MISSION_CODES, MOON_LANDING, ZERO_GRAVITY)
from app.models import (Badge, Child, EarnedBadge, Mission, MissionProgress, Planet,
                        PlanetVisit, QuizAttempt, RocketBuild, XPEvent)

QUIZ_MASTER_PERCENT = 80
PLANET_EXPLORER_COUNT = 5


def total_xp(db: Session, child_id: int) -> int:
    return int(db.scalar(select(func.coalesce(func.sum(XPEvent.amount), 0)).where(XPEvent.child_id == child_id)))


def award_xp(db: Session, child_id: int, source: str, source_key: str, amount: int, description: str) -> int:
    """Adds an XP event exactly once per (child, source_key). Returns XP actually awarded."""
    if amount <= 0:
        return 0
    exists = db.scalar(select(XPEvent.id).where(XPEvent.child_id == child_id, XPEvent.source_key == source_key))
    if exists:
        return 0
    try:
        with db.begin_nested():
            db.add(XPEvent(child_id=child_id, source=source, source_key=source_key,
                           amount=amount, description=description[:160]))
    except IntegrityError:  # concurrent duplicate submit
        return 0
    return amount


def completed_mission_codes(db: Session, child_id: int) -> set[str]:
    rows = db.execute(
        select(Mission.code).join(MissionProgress, MissionProgress.mission_id == Mission.id)
        .where(MissionProgress.child_id == child_id, MissionProgress.completed.is_(True))
    ).scalars()
    return set(rows)


def _badge_criteria(db: Session, child_id: int) -> dict[str, bool]:
    done = completed_mission_codes(db, child_id)
    visits = db.scalar(select(func.count(PlanetVisit.id)).where(PlanetVisit.child_id == child_id)) or 0
    planets_total = db.scalar(select(func.count(Planet.id))) or 0
    launched = db.scalar(select(RocketBuild.id).where(RocketBuild.child_id == child_id,
                                                      RocketBuild.launch_success.is_(True)).limit(1))
    quiz_best = db.scalar(select(func.max(QuizAttempt.percent)).where(QuizAttempt.child_id == child_id)) or 0
    return {
        "first_rocket_launch": launched is not None,
        "planet_explorer": visits >= PLANET_EXPLORER_COUNT,
        "zero_gravity_champion": ZERO_GRAVITY in done,
        "equipment_expert": EQUIPMENT_EXPERT in done,
        "moon_landing_hero": MOON_LANDING in done,
        "mission_commander": set(MISSION_CODES) <= done,
        "quiz_master": quiz_best >= QUIZ_MASTER_PERCENT,
        "galaxy_explorer": planets_total > 0 and visits >= planets_total,
    }


def evaluate_badges(db: Session, child_id: int) -> list[dict]:
    """Award every badge whose criteria are met and that is not yet earned. Returns new badges."""
    criteria = _badge_criteria(db, child_id)
    earned_ids = set(db.scalars(select(EarnedBadge.badge_id).where(EarnedBadge.child_id == child_id)))
    new = []
    for badge in db.scalars(select(Badge).order_by(Badge.order_index)):
        if badge.id in earned_ids or not criteria.get(badge.code):
            continue
        try:
            with db.begin_nested():
                db.add(EarnedBadge(child_id=child_id, badge_id=badge.id))
        except IntegrityError:
            continue
        award_xp(db, child_id, "badge", f"badge:{badge.code}", badge.xp_bonus, f"Badge earned: {badge.name}")
        new.append({"code": badge.code, "name": badge.name, "icon": badge.icon, "color": badge.color,
                    "description": badge.description, "xp_bonus": badge.xp_bonus})
    return new


def daily_status(db: Session, child_id: int, day: date | None = None) -> dict:
    day = day or date.today()
    challenge = daily_challenge_for(child_id, day)
    done = db.scalar(select(XPEvent.id).where(XPEvent.child_id == child_id,
                                              XPEvent.source_key == f"daily:{day.isoformat()}"))
    return {**challenge, "completed": done is not None}


def try_daily(db: Session, child_id: int, action_type: str, target: str | None = None) -> int:
    """Grant today's daily bonus if this action matches today's challenge."""
    day = date.today()
    ch = daily_challenge_for(child_id, day)
    if ch["type"] != action_type or (ch["target"] and ch["target"] != target):
        return 0
    return award_xp(db, child_id, "daily", f"daily:{day.isoformat()}", DAILY_BONUS_XP,
                    f"Daily challenge: {ch['title']}")


def reward_summary(db: Session, child: Child, xp_before: int, xp_earned: int, new_badges: list,
                   daily_bonus: int) -> dict:
    after = total_xp(db, child.id)
    before_lvl = level_info(xp_before)
    after_lvl = level_info(after)
    return {
        "xp_earned": xp_earned,
        "daily_bonus": daily_bonus,
        "badge_bonus": sum(b["xp_bonus"] for b in new_badges),
        "new_badges": new_badges,
        "total_xp": after,
        "level": after_lvl,
        "leveled_up": after_lvl["level"] > before_lvl["level"],
    }
