"""Per-child progress: missions, quizzes, badges, rockets, XP ledger, planet visits, certificates."""
from datetime import datetime
from typing import Optional

from sqlalchemy import (JSON, Boolean, DateTime, ForeignKey, Integer, String,
                        UniqueConstraint, CheckConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow
from app.models.content import Badge, Mission, Planet, Quiz


class MissionProgress(Base):
    """One summary row per child per mission."""

    __tablename__ = "mission_progress"
    __table_args__ = (
        UniqueConstraint("child_id", "mission_id", name="uq_progress_child_mission"),
        CheckConstraint("best_score >= 0 AND best_score <= 100", name="ck_progress_score"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    mission_id: Mapped[int] = mapped_column(ForeignKey("missions.id", ondelete="CASCADE"), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    best_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    xp_awarded: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    mission: Mapped[Mission] = relationship()


class MissionAttempt(Base):
    """Full mission history (every play)."""

    __tablename__ = "mission_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    mission_id: Mapped[int] = mapped_column(ForeignKey("missions.id", ondelete="CASCADE"), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    details: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False, index=True)

    mission: Mapped[Mission] = relationship()


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    percent: Mapped[int] = mapped_column(Integer, nullable=False)
    xp_earned: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    answers: Mapped[list] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    quiz: Mapped[Quiz] = relationship()


class EarnedBadge(Base):
    __tablename__ = "earned_badges"
    __table_args__ = (UniqueConstraint("child_id", "badge_id", name="uq_earned_badge"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    badge_id: Mapped[int] = mapped_column(ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    badge: Mapped[Badge] = relationship()


class RocketBuild(Base):
    __tablename__ = "rocket_builds"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    components: Mapped[dict] = mapped_column(JSON, nullable=False)
    body_color: Mapped[str] = mapped_column(String(20), nullable=False)
    accent_color: Mapped[str] = mapped_column(String(20), nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    launched: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    launch_success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class XPEvent(Base):
    """XP ledger. The unique (child_id, source_key) pair makes every reward one-time only."""

    __tablename__ = "xp_events"
    __table_args__ = (UniqueConstraint("child_id", "source_key", name="uq_xp_child_source"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False)  # mission|planet|quiz|rocket|badge|daily
    source_key: Mapped[str] = mapped_column(String(80), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(160), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class PlanetVisit(Base):
    __tablename__ = "planet_visits"
    __table_args__ = (UniqueConstraint("child_id", "planet_id", name="uq_planet_visit"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    planet_id: Mapped[int] = mapped_column(ForeignKey("planets.id", ondelete="CASCADE"), nullable=False)
    visited_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    planet: Mapped[Planet] = relationship()


class Certificate(Base):
    __tablename__ = "certificates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), unique=True, nullable=False)
    certificate_code: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
    level_name: Mapped[str] = mapped_column(String(40), nullable=False)
    total_xp: Mapped[int] = mapped_column(Integer, nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
