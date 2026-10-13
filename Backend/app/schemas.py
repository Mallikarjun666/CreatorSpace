
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


# ---------------- AUTHENTICATION ----------------

class SignupIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["creator", "brand"]
    company: Optional[str] = Field(default=None, max_length=150)
    tools: list[str] = Field(default_factory=list, max_length=10)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    company: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------- CREATOR SEARCH ----------------

class CreatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    name: str
    headline: str
    content_type: Optional[str] = None
    aspect_ratio: Optional[str] = None
    verified_tools: bool
    workflow: str
    tools: list[str]

    bio: str = ""
    specialization: str = ""
    skills: list[str] = Field(default_factory=list)
    verified_workflow: bool = False
    verified_past_work: bool = False

    @field_validator("tools", mode="before")
    @classmethod
    def tool_names(cls, value):
        return [
            tool.name if hasattr(tool, "name") else tool
            for tool in (value or [])
        ]

# ---------------- PORTFOLIO SCHEMAS ----------------

class PortfolioItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    media_url: str = Field(min_length=1, max_length=1000)
    media_type: Literal["Image", "Video", "Animation", "Other"] = "Image"
    aspect_ratio: Literal["9:16", "16:9", "1:1"] = "1:1"
    tools_used: list[str] = Field(default_factory=list, max_length=10)
    workflow: str = Field(default="", max_length=5000)
    is_featured: bool = False


class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    media_url: Optional[str] = Field(default=None, min_length=1, max_length=1000)
    media_type: Optional[
        Literal["Image", "Video", "Animation", "Other"]
    ] = None
    aspect_ratio: Optional[Literal["9:16", "16:9", "1:1"]] = None
    tools_used: Optional[list[str]] = Field(default=None, max_length=10)
    workflow: Optional[str] = Field(default=None, max_length=5000)
    is_featured: Optional[bool] = None


class PortfolioItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    creator_id: int
    title: str
    description: str
    media_url: str
    media_type: str
    aspect_ratio: str
    tools_used: list[str]
    workflow: str
    is_featured: bool
    created_at: datetime


# ---------------- CREATOR PROFILE SCHEMAS ----------------

class CreatorProfileUpdate(BaseModel):
    profile_picture_url: Optional[str] = Field(
        default=None, max_length=500
    )
    headline: Optional[str] = Field(default=None, min_length=1, max_length=150)
    content_type: Optional[Literal["Video", "Image", "Animation"]] = None
    aspect_ratio: Optional[Literal["9:16", "16:9", "1:1"]] = None
    workflow: Optional[str] = Field(default=None, max_length=5000)

    bio: Optional[str] = Field(default=None, max_length=5000)
    specialization: Optional[str] = Field(default=None, max_length=100)
    skills: Optional[list[str]] = Field(default=None, max_length=30)
    website_url: Optional[str] = Field(default=None, max_length=500)
    social_links: Optional[dict[str, str]] = None

    tools: Optional[list[str]] = Field(default=None, max_length=10)


class CreatorProfileOut(BaseModel):
    profile_picture_url: Optional[str] = None
    id: int
    user_id: Optional[int] = None
    name: str
    headline: str
    content_type: Optional[str] = None
    aspect_ratio: Optional[str] = None
    workflow: str
    verified_tools: bool
    tools: list[str]

    bio: str
    specialization: str
    skills: list[str]
    website_url: Optional[str] = None
    social_links: dict[str, str]
    verified_workflow: bool
    verified_past_work: bool

    portfolio_items: list[PortfolioItemOut] = Field(default_factory=list)


# ---------------- CAMPAIGN BRIEFS ----------------

class BriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    brand_name: str
    title: str
    description: str
    content_type: str
    aspect_ratio: str
    style: str
    budget: Optional[int] = None
    deadline: Optional[date] = None
    commercial_use: str


class BriefCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    content_type: Literal["Video", "Image", "Animation"]
    aspect_ratio: Literal["9:16", "16:9", "1:1"]
    style: str = Field(default="", max_length=100)
    budget: Optional[int] = Field(default=None, ge=0)
    deadline: Optional[date] = None
    commercial_use: str = Field(default="", max_length=150)


# ---------------- HOME FEED ----------------

class PostCreate(BaseModel):
    text: str = Field(default="", max_length=5000)
    kind: str = Field(default="Update", max_length=60)
    images: list[str] = Field(default_factory=list, max_length=10)
    brief_id: Optional[int] = None


class PostCommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class PostCommentOut(BaseModel):
    id: int
    user_id: int
    user_name: str
    text: str
    created_at: datetime


class PostOut(BaseModel):

    id: int
    author_id: int
    author_name: str
    author_role: str
    kind: str
    text: str
    images: list[str]
    brief_id: Optional[int] = None
    created_at: datetime
    likes_count: int
    comments: list[PostCommentOut]
    liked_by_me: bool
    saved_by_me: bool






class MessageCreate(BaseModel):
    recipient_id: int
    content: str = Field(min_length=1, max_length=5000)


class MessageOut(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    content: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationOut(BaseModel):
    id: int
    user_id: int
    actor_id: int | None
    notification_type: str
    message: str
    link: str | None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectCreate(BaseModel):
    creator_id: int
    brief_id: int | None = None
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None


class ProjectStatusUpdate(BaseModel):
    status: str = Field(
        pattern="^(pending|accepted|in_progress|completed|cancelled)$"
    )


class ProjectOut(BaseModel):
    id: int
    brand_id: int
    creator_id: int
    brief_id: int | None
    title: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)