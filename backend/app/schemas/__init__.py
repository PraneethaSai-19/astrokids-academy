"""Pydantic request/response schemas."""
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

AGE_GROUPS = ("6-8", "9-10")
HEX_PATTERN = r"^#[0-9A-Fa-f]{6}$"
NICKNAME_PATTERN = r"^[A-Za-z0-9 _-]{2,20}$"


def _check_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not any(ch.isdigit() for ch in v) or not any(ch.isalpha() for ch in v):
        raise ValueError("Password must contain letters and at least one number.")
    return v


# ------------------------------------------------------------------ auth
class ChildCreate(BaseModel):
    nickname: str = Field(..., pattern=NICKNAME_PATTERN,
                          description="Astronaut nickname (2-20 letters/numbers). Please don't use a real full name.")
    age_group: Literal["6-8", "9-10"] = "6-8"

    @field_validator("nickname")
    @classmethod
    def strip_nick(cls, v: str) -> str:
        return " ".join(v.split())


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)
    display_name: str = Field("Parent", min_length=1, max_length=60)
    child: Optional[ChildCreate] = None
    accept_parent_terms: bool = Field(..., description="Parent confirms they are an adult managing the child's account.")

    @field_validator("password")
    @classmethod
    def strong(cls, v: str) -> str:
        return _check_password(v)

    @field_validator("accept_parent_terms")
    @classmethod
    def must_accept(cls, v: bool) -> bool:
        if not v:
            raise ValueError("A parent or guardian must create the account.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)


class PasswordOnly(BaseModel):
    password: str = Field(..., max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    scope: str


class AvatarIn(BaseModel):
    suit_color: str = Field(..., pattern=HEX_PATTERN)
    helmet_style: Literal["classic", "bubble", "visor", "cat"]
    visor_color: str = Field(..., pattern=HEX_PATTERN)
    backpack_style: Literal["oxygen", "jetpack", "rocket", "none"]
    accessory: Literal["none", "antenna", "star_badge", "flag", "headphones"]


class AvatarOut(AvatarIn):
    model_config = ConfigDict(from_attributes=True)


class ChildOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nickname: str
    age_group: str
    avatar: Optional[AvatarOut] = None
    total_xp: int = 0
    level: dict = {}


class ParentOut(BaseModel):
    id: int
    email: str
    display_name: str
    children: list[ChildOut]


# ------------------------------------------------------------------ gameplay
class MissionSubmit(BaseModel):
    result: dict[str, Any] = Field(..., description="Game-specific result data. The server validates it and computes score/XP.")


class MissionCheck(BaseModel):
    item_id: Optional[str] = Field(None, max_length=40)
    category_id: Optional[str] = Field(None, max_length=40)
    scenario_id: Optional[str] = Field(None, max_length=40)
    option_id: Optional[str] = Field(None, max_length=10)


class QuizSubmit(BaseModel):
    answers: list[int] = Field(..., max_length=50)


class RocketIn(BaseModel):
    name: str = Field("My Rocket", min_length=1, max_length=40)
    components: dict[str, Any]
    body_color: str = Field("#FFFFFF", pattern=HEX_PATTERN)
    accent_color: str = Field("#FFB8D0", pattern=HEX_PATTERN)


class ChatTurn(BaseModel):
    role: Literal["child", "bot", "user", "assistant"]
    content: str = Field(..., max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=300)
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)


class ChildSettingsIn(BaseModel):
    ai_enabled: Optional[bool] = None
    ai_live_allowed: Optional[bool] = None
    ai_daily_limit: Optional[int] = Field(None, ge=0, le=200)
    age_group: Optional[Literal["6-8", "9-10"]] = None
    nickname: Optional[str] = Field(None, pattern=NICKNAME_PATTERN)


class AccountUpdate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=60)


class ChangePassword(BaseModel):
    current_password: str = Field(..., max_length=128)
    new_password: str = Field(..., max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong(cls, v: str) -> str:
        return _check_password(v)


class Message(BaseModel):
    message: str
    timestamp: Optional[datetime] = None
