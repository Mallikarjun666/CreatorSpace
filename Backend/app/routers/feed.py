
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    Brief,
    Creator,
    CreatorProfileDetails,
    PortfolioItem,
    Post,
    PostComment,
    PostLike,
    PostSave,
    Tool,
    User,
)
from ..schemas import (
    CreatorOut,
    CreatorProfileOut,
    CreatorProfileUpdate,
    PortfolioItemCreate,
    PortfolioItemOut,
    PortfolioItemUpdate,
    PostCommentCreate,
    PostCommentOut,
    PostCreate,
    PostOut,
)

router = APIRouter(tags=["feed"])


# ---------------- IMAGE UPLOADS ----------------

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_IMAGE_BYTES = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image.",
        )

    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Use JPG, PNG, WEBP, or GIF images.",
        )

    try:
        content = await file.read(MAX_IMAGE_BYTES + 1)
    finally:
        await file.close()

    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Image size must be 10 MB or less.",
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    filename = f"{uuid4().hex}{extension}"
    (UPLOAD_DIR / filename).write_bytes(content)

    return {"url": f"/uploads/{filename}"}


# ---------------- HELPERS ----------------

def get_or_create_tool(db: Session, raw_name: str) -> Optional[Tool]:
    name = raw_name.strip()[:60]

    if not name:
        return None

    tool = db.scalar(select(Tool).where(Tool.name == name))

    if tool is None:
        tool = Tool(name=name)
        db.add(tool)
        db.flush()

    return tool


def creator_options():
    return (
        selectinload(Creator.tools),
        selectinload(Creator.profile_details),
        selectinload(Creator.portfolio_items),
    )


def get_creator_for_user(
    db: Session,
    user: User,
    create_if_missing: bool = False,
) -> Creator:
    if user.role != "creator":
        raise HTTPException(
            status_code=403,
            detail="This feature is only available to creator accounts.",
        )

    creator = db.scalar(
        select(Creator)
        .options(*creator_options())
        .where(Creator.user_id == user.id)
    )

    if creator is None and create_if_missing:
        creator = Creator(
            user_id=user.id,
            name=user.name,
            headline="AI creator",
        )
        db.add(creator)
        db.commit()

        creator = db.scalar(
            select(Creator)
            .options(*creator_options())
            .where(Creator.user_id == user.id)
        )

    if creator is None:
        raise HTTPException(
            status_code=404,
            detail="Creator profile not found.",
        )

    return creator


def format_creator_profile(creator: Creator) -> dict:
    details = creator.profile_details

    return {
        "id": creator.id,
        "user_id": creator.user_id,
        "name": creator.name,
        "headline": creator.headline,
        "content_type": creator.content_type,
        "aspect_ratio": creator.aspect_ratio,
        "workflow": creator.workflow or "",
        "verified_tools": creator.verified_tools,
        "tools": [tool.name for tool in creator.tools],
        "bio": (details.bio or "") if details else "",
        "specialization": (
            details.specialization or ""
        ) if details else "",
        "skills": (details.skills or []) if details else [],
        "website_url": details.website_url if details else None,
        "social_links": (
            details.social_links or {}
        ) if details else {},
        "profile_picture_url": (
            details.profile_picture_url
        ) if details else None,
        "verified_workflow": (
            details.verified_workflow
        ) if details else False,
        "verified_past_work": (
            details.verified_past_work
        ) if details else False,
        "portfolio_items": [
            {
                "id": item.id,
                "creator_id": item.creator_id,
                "title": item.title,
                "description": item.description,
                "media_url": item.media_url,
                "media_type": item.media_type,
                "aspect_ratio": item.aspect_ratio,
                "tools_used": item.tools_used or [],
                "workflow": item.workflow or "",
                "is_featured": item.is_featured,
                "created_at": item.created_at,
            }
            for item in creator.portfolio_items
        ],
    }


# ---------------- CREATOR PROFILE API ----------------

@router.get("/creator/profile", response_model=CreatorProfileOut)
def get_my_creator_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = get_creator_for_user(db, user)
    return format_creator_profile(creator)


@router.put("/creator/profile", response_model=CreatorProfileOut)
def update_my_creator_profile(
    data: CreatorProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = get_creator_for_user(
        db,
        user,
        create_if_missing=True,
    )

    updates = data.model_dump(exclude_unset=True)
    requested_tools = updates.pop("tools", None)

    creator_fields = {
        "headline",
        "content_type",
        "aspect_ratio",
        "workflow",
    }

    for field in creator_fields:
        if field in updates:
            value = updates.pop(field)

            if value is not None or field in {
                "content_type",
                "aspect_ratio",
            }:
                setattr(creator, field, value)

    details_fields = {
        "bio",
        "specialization",
        "skills",
        "website_url",
        "social_links",
        "profile_picture_url",
    }

    if any(field in updates for field in details_fields):
        details = creator.profile_details

        if details is None:
            details = CreatorProfileDetails(creator_id=creator.id)
            db.add(details)
            creator.profile_details = details

        for field in details_fields:
            if field not in updates:
                continue

            value = updates[field]

            if field == "skills" and value is None:
                value = []
            elif field == "social_links" and value is None:
                value = {}
            elif field in {"bio", "specialization"} and value is None:
                value = ""

            setattr(details, field, value)

    if requested_tools is not None:
        tools_by_name = {}

        for raw_name in requested_tools:
            tool = get_or_create_tool(db, raw_name)

            if tool is not None:
                tools_by_name[tool.name.casefold()] = tool

        creator.tools = list(tools_by_name.values())

    db.commit()

    creator = db.scalar(
        select(Creator)
        .options(*creator_options())
        .where(Creator.id == creator.id)
    )

    return format_creator_profile(creator)


@router.get(
    "/creators/{creator_id}/profile",
    response_model=CreatorProfileOut,
)
def get_creator_public_profile(
    creator_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    creator = db.scalar(
        select(Creator)
        .options(*creator_options())
        .where(Creator.id == creator_id)
    )

    if creator is None:
        raise HTTPException(
            status_code=404,
            detail="Creator profile not found.",
        )

    return format_creator_profile(creator)


# ---------------- PORTFOLIO API ----------------

@router.get(
    "/creator/portfolio",
    response_model=list[PortfolioItemOut],
)
def list_my_portfolio(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = get_creator_for_user(db, user)
    return creator.portfolio_items


@router.post(
    "/creator/portfolio",
    response_model=PortfolioItemOut,
    status_code=201,
)
def create_portfolio_item(
    data: PortfolioItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = get_creator_for_user(
        db,
        user,
        create_if_missing=True,
    )

    item = PortfolioItem(
        creator_id=creator.id,
        **data.model_dump(),
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.patch(
    "/creator/portfolio/{item_id}",
    response_model=PortfolioItemOut,
)
def update_portfolio_item(
    item_id: int,
    data: PortfolioItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = get_creator_for_user(db, user)
    item = db.get(PortfolioItem, item_id)

    if item is None or item.creator_id != creator.id:
        raise HTTPException(
            status_code=404,
            detail="Portfolio item not found.",
        )

    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/creator/portfolio/{item_id}")
def delete_portfolio_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = get_creator_for_user(db, user)
    item = db.get(PortfolioItem, item_id)

    if item is None or item.creator_id != creator.id:
        raise HTTPException(
            status_code=404,
            detail="Portfolio item not found.",
        )

    db.delete(item)
    db.commit()

    return {"detail": "Portfolio item deleted."}


# ---------------- CREATOR SEARCH ----------------

@router.get("/creators", response_model=list[CreatorOut])
def list_creators(
    content_type: list[str] = Query(default=[]),
    aspect_ratio: list[str] = Query(default=[]),
    tools: list[str] = Query(default=[]),
    verified_only: bool = False,
    q: Optional[str] = None,
    skill: Optional[str] = None,
    specialization: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    stmt = select(Creator).options(
        selectinload(Creator.tools),
        selectinload(Creator.profile_details),
    )

    if content_type:
        stmt = stmt.where(Creator.content_type.in_(content_type))

    if aspect_ratio:
        stmt = stmt.where(Creator.aspect_ratio.in_(aspect_ratio))

    if tools:
        stmt = stmt.where(Creator.tools.any(Tool.name.in_(tools)))

    if verified_only:
        stmt = stmt.where(Creator.verified_tools.is_(True))

    creators = db.scalars(
        stmt.order_by(Creator.id.desc())
    ).all()

    query_text = (q or "").strip().casefold()
    skill_text = (skill or "").strip().casefold()
    specialization_text = (specialization or "").strip().casefold()

    results = []

    for creator in creators:
        details = creator.profile_details
        skills = (details.skills or []) if details else []
        bio = (details.bio or "") if details else ""
        creator_specialization = (
            (details.specialization or "") if details else ""
        )
        tool_names = [tool.name for tool in creator.tools]

        searchable_text = " ".join([
            creator.name or "",
            creator.headline or "",
            creator.workflow or "",
            bio,
            creator_specialization,
            *skills,
            *tool_names,
        ]).casefold()

        if query_text and query_text not in searchable_text:
            continue

        if skill_text and not any(
            skill_text in item.casefold() for item in skills
        ):
            continue

        if specialization_text and (
            specialization_text not in creator_specialization.casefold()
        ):
            continue

        results.append({
            "id": creator.id,
            "user_id": creator.user_id,
            "name": creator.name,
            "headline": creator.headline,
            "content_type": creator.content_type,
            "aspect_ratio": creator.aspect_ratio,
            "verified_tools": creator.verified_tools,
            "workflow": creator.workflow or "",
            "tools": tool_names,
            "bio": bio,
            "specialization": creator_specialization,
            "skills": skills,
            "verified_workflow": (
                details.verified_workflow if details else False
            ),
            "verified_past_work": (
                details.verified_past_work if details else False
            ),
        })

    return results


# ---------------- HOME FEED POSTS ----------------

def format_post(post: Post, current_user_id: int) -> dict:
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_name": post.author.name,
        "author_role": post.author.role,
        "kind": post.kind,
        "text": post.text,
        "images": post.images or [],
        "brief_id": post.brief_id,
        "created_at": post.created_at,
        "likes_count": len(post.likes),
        "comments": [
            {
                "id": comment.id,
                "user_id": comment.user_id,
                "user_name": comment.user.name,
                "text": comment.text,
                "created_at": comment.created_at,
            }
            for comment in post.comments
        ],
        "liked_by_me": any(
            like.user_id == current_user_id for like in post.likes
        ),
        "saved_by_me": any(
            save.user_id == current_user_id for save in post.saves
        ),
    }


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.scalar(
        select(Post)
        .options(
            selectinload(Post.author),
            selectinload(Post.likes),
            selectinload(Post.saves),
            selectinload(Post.comments).selectinload(PostComment.user),
        )
        .where(Post.id == post_id)
    )

    if post is None:
        raise HTTPException(
            status_code=404,
            detail="Post not found.",
        )

    return post


@router.get("/posts", response_model=list[PostOut])
def list_posts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    posts = db.scalars(
        select(Post)
        .options(
            selectinload(Post.author),
            selectinload(Post.likes),
            selectinload(Post.saves),
            selectinload(Post.comments).selectinload(PostComment.user),
        )
        .order_by(Post.created_at.desc(), Post.id.desc())
    ).all()

    return [format_post(post, user.id) for post in posts]


@router.post("/posts", response_model=PostOut, status_code=201)
def create_post(
    data: PostCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not data.text.strip() and not data.images:
        raise HTTPException(
            status_code=400,
            detail="Write something or add an image before publishing.",
        )

    if data.brief_id is not None and db.get(Brief, data.brief_id) is None:
        raise HTTPException(
            status_code=404,
            detail="Campaign brief not found.",
        )

    post = Post(
        author_id=user.id,
        kind=data.kind.strip() or "Update",
        text=data.text.strip(),
        images=data.images,
        brief_id=data.brief_id,
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return format_post(get_post_or_404(db, post.id), user.id)


# ---------------- LIKES ----------------

@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_post_or_404(db, post_id)

    like = db.scalar(
        select(PostLike).where(
            PostLike.post_id == post_id,
            PostLike.user_id == user.id,
        )
    )

    if like:
        db.delete(like)
        liked = False
    else:
        db.add(PostLike(post_id=post_id, user_id=user.id))
        liked = True

    db.commit()

    likes_count = len(
        db.scalars(
            select(PostLike).where(PostLike.post_id == post_id)
        ).all()
    )

    return {
        "liked": liked,
        "likes_count": likes_count,
    }


# ---------------- COMMENTS ----------------

@router.post(
    "/posts/{post_id}/comments",
    response_model=PostCommentOut,
    status_code=201,
)
def create_comment(
    post_id: int,
    data: PostCommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_post_or_404(db, post_id)
    comment_text = data.text.strip()

    if not comment_text:
        raise HTTPException(
            status_code=400,
            detail="Comment cannot be empty.",
        )

    comment = PostComment(
        post_id=post_id,
        user_id=user.id,
        text=comment_text,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "user_id": user.id,
        "user_name": user.name,
        "text": comment.text,
        "created_at": comment.created_at,
    }


# ---------------- SAVED POSTS ----------------

@router.post("/posts/{post_id}/save")
def toggle_save(
    post_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_post_or_404(db, post_id)

    saved_post = db.scalar(
        select(PostSave).where(
            PostSave.post_id == post_id,
            PostSave.user_id == user.id,
        )
    )

    if saved_post:
        db.delete(saved_post)
        saved = False
    else:
        db.add(PostSave(post_id=post_id, user_id=user.id))
        saved = True

    db.commit()

    return {"saved": saved}


# ---------------- LIST SAVED POSTS ----------------

@router.get("/saved", response_model=list[PostOut])
def list_saved_posts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    posts = db.scalars(
        select(Post)
        .join(PostSave, PostSave.post_id == Post.id)
        .options(
            selectinload(Post.author),
            selectinload(Post.likes),
            selectinload(Post.saves),
            selectinload(Post.comments).selectinload(PostComment.user),
        )
        .where(PostSave.user_id == user.id)
        .order_by(PostSave.id.desc())
    ).all()

    return [format_post(post, user.id) for post in posts]

