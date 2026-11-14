from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, utcnow


class AISession(Base):
    """One AstroBot session per child per day; used for usage limits and parent reporting."""

    __tablename__ = "ai_sessions"
    __table_args__ = (UniqueConstraint("child_id", "session_date", name="uq_ai_session_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("children.id", ondelete="CASCADE"), index=True, nullable=False)
    session_date: Mapped[date] = mapped_column(Date, nullable=False)
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    demo_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    blocked_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    messages: Mapped[list["AIMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="AIMessage.id"
    )


class AIMessage(Base):
    """Questions and answers, kept so parents can review what was asked. Parents can delete them."""

    __tablename__ = "ai_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("ai_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # child | bot
    content: Mapped[str] = mapped_column(String(2000), nullable=False)
    mode: Mapped[str] = mapped_column(String(10), nullable=False, default="demo")  # live | demo | safety
    flagged: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    session: Mapped[AISession] = relationship(back_populates="messages")
