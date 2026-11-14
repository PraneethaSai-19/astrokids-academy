"""Helpers for creating and summarising child profiles."""
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.game.levels import level_info
from app.models import AstronautProfile, Child, Parent
from app.services.progression import total_xp

MAX_CHILDREN = 6
DEFAULT_AVATAR = dict(suit_color="#66CDEB", helmet_style="classic", visor_color="#FFCB69",
                      backpack_style="oxygen", accessory="none")


def avatar_dict(profile: AstronautProfile | None) -> dict | None:
    if profile is None:
        return None
    return {k: getattr(profile, k) for k in DEFAULT_AVATAR}


def child_summary(db: Session, child: Child) -> dict:
    xp = total_xp(db, child.id)
    return {
        "id": child.id,
        "nickname": child.nickname,
        "age_group": child.age_group,
        "avatar": avatar_dict(child.profile),
        "has_avatar": child.profile is not None,
        "total_xp": xp,
        "level": level_info(xp),
        "ai_enabled": child.ai_enabled,
    }


def create_child(db: Session, parent: Parent, nickname: str, age_group: str) -> Child:
    count = db.scalar(select(func.count(Child.id)).where(Child.parent_id == parent.id)) or 0
    if count >= MAX_CHILDREN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"You can add up to {MAX_CHILDREN} astronauts.")
    clash = db.scalar(select(Child.id).where(Child.parent_id == parent.id,
                                             func.lower(Child.nickname) == nickname.lower()))
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="You already have an astronaut with that nickname.")
    child = Child(parent_id=parent.id, nickname=nickname, age_group=age_group)
    db.add(child)
    db.flush()
    return child
