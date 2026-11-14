from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow


class Parent(Base):
    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(60), nullable=False, default="Parent")
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    children: Mapped[list["Child"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan", order_by="Child.id"
    )


class Child(Base):
    """A child profile. Only a nickname and age group are stored (no real names, birthdays or photos)."""

    __tablename__ = "children"
    __table_args__ = (UniqueConstraint("parent_id", "nickname", name="uq_child_parent_nickname"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id", ondelete="CASCADE"), index=True, nullable=False)
    nickname: Mapped[str] = mapped_column(String(30), nullable=False)
    age_group: Mapped[str] = mapped_column(String(10), nullable=False, default="6-8")
    ai_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ai_live_allowed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    ai_daily_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    parent: Mapped[Parent] = relationship(back_populates="children")
    profile: Mapped[Optional["AstronautProfile"]] = relationship(
        back_populates="child", cascade="all, delete-orphan", uselist=False
    )


class AstronautProfile(Base):
    __tablename__ = "astronaut_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(
        ForeignKey("children.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    suit_color: Mapped[str] = mapped_column(String(20), nullable=False, default="#66CDEB")
    helmet_style: Mapped[str] = mapped_column(String(20), nullable=False, default="classic")
    visor_color: Mapped[str] = mapped_column(String(20), nullable=False, default="#FFCB69")
    backpack_style: Mapped[str] = mapped_column(String(20), nullable=False, default="oxygen")
    accessory: Mapped[str] = mapped_column(String(20), nullable=False, default="none")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    child: Mapped[Child] = relationship(back_populates="profile")


class ChildSession(Base):
    """Session history shown on the parent dashboard (when a child started playing)."""

    __tablename__ = "child_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    last_active_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
