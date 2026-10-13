from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


# ---------------- CREATOR-TOOL ASSOCIATION ----------------

creator_tools = Table(
    "creator_tools",
    Base.metadata,
    Column(
        "creator_id",
        ForeignKey("creators.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tool_id",
        ForeignKey("tools.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


# ---------------- USERS ----------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(100))

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(String(255))

    role: Mapped[str] = mapped_column(String(10))

    company: Mapped[Optional[str]] = mapped_column(
        String(150),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    creator: Mapped[Optional["Creator"]] = relationship(
        back_populates="user",
        uselist=False,
    )


# ---------------- AI TOOLS ----------------

class Tool(Base):
    __tablename__ = "tools"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(60),
        unique=True,
    )


# ---------------- CREATOR PROFILES ----------------

class Creator(Base):
    __tablename__ = "creators"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        unique=True,
        nullable=True,
    )

    name: Mapped[str] = mapped_column(String(100))

    headline: Mapped[str] = mapped_column(String(150))

    content_type: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )

    aspect_ratio: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True,
    )

    workflow: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    verified_tools: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    user: Mapped[Optional["User"]] = relationship(
        back_populates="creator",
    )

    tools: Mapped[list["Tool"]] = relationship(
        secondary=creator_tools,
        lazy="selectin",
    )

    profile_details: Mapped[
        Optional["CreatorProfileDetails"]
    ] = relationship(
        back_populates="creator",
        uselist=False,
        cascade="all, delete-orphan",
    )

    portfolio_items: Mapped[list["PortfolioItem"]] = relationship(
        back_populates="creator",
        cascade="all, delete-orphan",
        order_by="PortfolioItem.created_at.desc()",
    )


# ---------------- EXTENDED CREATOR PROFILE DETAILS ----------------

class CreatorProfileDetails(Base):
    __tablename__ = "creator_profile_details"

    id: Mapped[int] = mapped_column(primary_key=True)

    creator_id: Mapped[int] = mapped_column(
        ForeignKey("creators.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )

    bio: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    specialization: Mapped[str] = mapped_column(
        String(100),
        default="",
    )

    skills: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
    )

    website_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    social_links: Mapped[dict[str, str]] = mapped_column(
        JSON,
        default=dict,
    )

    # Uploaded profile picture URL/path
    profile_picture_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        default=None,
    )

    # Verification flags remain false until genuinely verified.
    verified_workflow: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    verified_past_work: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    creator: Mapped["Creator"] = relationship(
        back_populates="profile_details",
    )


# ---------------- AI PORTFOLIO ITEMS ----------------

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id: Mapped[int] = mapped_column(primary_key=True)

    creator_id: Mapped[int] = mapped_column(
        ForeignKey("creators.id", ondelete="CASCADE"),
        index=True,
    )

    title: Mapped[str] = mapped_column(String(200))

    description: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    # Uploaded media path or externally hosted media URL.
    media_url: Mapped[str] = mapped_column(String(1000))

    # Image, Video, Animation, or Other.
    media_type: Mapped[str] = mapped_column(
        String(20),
        default="Image",
    )

    aspect_ratio: Mapped[str] = mapped_column(
        String(10),
        default="1:1",
    )

    # Names of AI tools/models used for this portfolio item.
    tools_used: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
    )

    workflow: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    is_featured: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    creator: Mapped["Creator"] = relationship(
        back_populates="portfolio_items",
    )


# ---------------- CAMPAIGN BRIEFS ----------------

class Brief(Base):
    __tablename__ = "briefs"

    id: Mapped[int] = mapped_column(primary_key=True)

    posted_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    brand_name: Mapped[str] = mapped_column(String(150))

    title: Mapped[str] = mapped_column(String(200))

    description: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    content_type: Mapped[str] = mapped_column(String(20))

    aspect_ratio: Mapped[str] = mapped_column(String(10))

    style: Mapped[str] = mapped_column(
        String(100),
        default="",
    )

    budget: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    deadline: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )

    commercial_use: Mapped[str] = mapped_column(
        String(150),
        default="",
    )


# ---------------- HOME FEED POSTS ----------------

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)

    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    kind: Mapped[str] = mapped_column(
        String(60),
        default="Update",
    )

    text: Mapped[str] = mapped_column(
        Text,
        default="",
    )

    # Image URLs only; media files live separately.
    images: Mapped[list[str]] = mapped_column(
        JSON,
        default=list,
    )

    brief_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("briefs.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        index=True,
    )

    author: Mapped["User"] = relationship()

    likes: Mapped[list["PostLike"]] = relationship(
        cascade="all, delete-orphan",
    )

    comments: Mapped[list["PostComment"]] = relationship(
        cascade="all, delete-orphan",
        order_by="PostComment.created_at",
    )

    saves: Mapped[list["PostSave"]] = relationship(
        cascade="all, delete-orphan",
    )


# ---------------- POST LIKES ----------------

class PostLike(Base):
    __tablename__ = "post_likes"

    __table_args__ = (
        UniqueConstraint(
            "post_id",
            "user_id",
            name="uq_like_post_user",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )


# ---------------- POST COMMENTS ----------------

class PostComment(Base):
    __tablename__ = "post_comments"

    id: Mapped[int] = mapped_column(primary_key=True)

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    text: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship()


# ---------------- SAVED POSTS ----------------

class PostSave(Base):
    __tablename__ = "post_saves"

    __table_args__ = (
        UniqueConstraint(
            "post_id",
            "user_id",
            name="uq_save_post_user",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    post_id: Mapped[int] = mapped_column(
        ForeignKey("posts.id", ondelete="CASCADE"),
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    notification_type = Column(String(50), nullable=False)
    message = Column(String(500), nullable=False)
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    brand_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("creators.id"), nullable=False, index=True)
    brief_id = Column(Integer, ForeignKey("briefs.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="pending", nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )