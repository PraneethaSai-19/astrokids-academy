"""Import every model so Base.metadata knows all tables."""
from app.models.users import Parent, Child, AstronautProfile, ChildSession
from app.models.content import Planet, Mission, Quiz, QuizQuestion, Badge
from app.models.progress import (MissionProgress, MissionAttempt, QuizAttempt, EarnedBadge,
                                 RocketBuild, XPEvent, PlanetVisit, Certificate)
from app.models.ai import AISession, AIMessage

__all__ = [
    "Parent", "Child", "AstronautProfile", "ChildSession", "Planet", "Mission", "Quiz",
    "QuizQuestion", "Badge", "MissionProgress", "MissionAttempt", "QuizAttempt", "EarnedBadge",
    "RocketBuild", "XPEvent", "PlanetVisit", "Certificate", "AISession", "AIMessage",
]
