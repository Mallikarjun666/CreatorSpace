from ..schemas import (
    BriefCreate,
    BriefOut,
    MessageCreate,
    MessageOut,
    NotificationOut,
    ProjectCreate,
    ProjectStatusUpdate,
    ProjectOut,
)

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    User,
    Creator,
    Brief,
    Message,
    Notification,
    Project,
)
from ..schemas import (
    MessageCreate,
    MessageOut,
    NotificationOut,
    ProjectCreate,
    ProjectStatusUpdate,
    ProjectOut,
)
from .auth import get_current_user

router = APIRouter(tags=["marketplace"])


# ---------------- CAMPAIGN BRIEFS ----------------


@router.get("/briefs", response_model=list[BriefOut])
def get_briefs(
    content_type: list[str] = Query(default=[]),
    aspect_ratio: list[str] = Query(default=[]),
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Brief).order_by(Brief.id.desc())

    # Brands can see only their own briefs.
    # Creators can discover briefs from all brands.
    if user.role == "brand":
        query = query.where(Brief.posted_by == user.id)

    if content_type:
        query = query.where(Brief.content_type.in_(content_type))

    if aspect_ratio:
        query = query.where(Brief.aspect_ratio.in_(aspect_ratio))

    if q and q.strip():
        search_term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Brief.title.like(search_term),
                Brief.brand_name.like(search_term),
                Brief.description.like(search_term),
                Brief.style.like(search_term),
            )
        )

    return db.scalars(query).all()

@router.post(
    "/briefs",
    response_model=BriefOut,
    status_code=201,
)
def create_brief(
    data: BriefCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "brand":
        raise HTTPException(
            status_code=403,
            detail="Only brands can create campaign briefs.",
        )

    title = data.title.strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Campaign title cannot be empty.",
        )

    brief = Brief(
        posted_by=user.id,
        brand_name=user.company or user.name,
        title=title,
        description=data.description,
        content_type=data.content_type,
        aspect_ratio=data.aspect_ratio,
        style=data.style,
        budget=data.budget,
        deadline=data.deadline,
        commercial_use=data.commercial_use,
    )

    db.add(brief)
    db.commit()
    db.refresh(brief)

    return brief
# ---------------- MESSAGES ----------------

@router.get("/messages/conversations")
def get_conversations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        select(Message)
        .where(
            or_(
                Message.sender_id == user.id,
                Message.recipient_id == user.id,
            )
        )
        .order_by(
            Message.created_at.desc(),
            Message.id.desc(),
        )
    )

    all_messages = db.scalars(query).all()
    conversations = {}

    for message in all_messages:
        other_user_id = (
            message.recipient_id
            if message.sender_id == user.id
            else message.sender_id
        )

        if other_user_id not in conversations:
            other_user = db.get(User, other_user_id)

            if other_user:
                conversations[other_user_id] = {
                    "user_id": other_user.id,
                    "name": other_user.name,
                    "role": other_user.role,
                    "last_message": message.content,
                    "created_at": message.created_at,
                    "unread_count": 0,
                }

        if (
            message.recipient_id == user.id
            and not message.is_read
            and other_user_id in conversations
        ):
            conversations[other_user_id]["unread_count"] += 1

    return list(conversations.values())


@router.get("/messages", response_model=list[MessageOut])
def get_messages(
    with_user_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Message).where(
        or_(
            Message.sender_id == user.id,
            Message.recipient_id == user.id,
        )
    )

    if with_user_id is not None:
        query = query.where(
            or_(
                (
                    (Message.sender_id == user.id)
                    & (Message.recipient_id == with_user_id)
                ),
                (
                    (Message.sender_id == with_user_id)
                    & (Message.recipient_id == user.id)
                ),
            )
        )

    return db.scalars(
        query.order_by(
            Message.created_at.asc(),
            Message.id.asc(),
        )
    ).all()


@router.post("/messages", response_model=MessageOut, status_code=201)
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if data.recipient_id == user.id:
        raise HTTPException(400, "You cannot message yourself.")

    recipient = db.get(User, data.recipient_id)

    if not recipient:
        raise HTTPException(404, "Recipient not found.")

    message_content = data.content.strip()

    if not message_content:
        raise HTTPException(400, "Message cannot be empty.")

    message = Message(
        sender_id=user.id,
        recipient_id=recipient.id,
        content=message_content,
    )

    db.add(message)

    db.add(
        Notification(
            user_id=recipient.id,
            actor_id=user.id,
            notification_type="message",
            message=f"{user.name} sent you a message.",
            link="/messages",
        )
    )

    db.commit()
    db.refresh(message)

    return message


# ---------------- NOTIFICATIONS ----------------

@router.get(
    "/notifications",
    response_model=list[NotificationOut],
)
def get_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
    ).all()


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notification = db.get(Notification, notification_id)

    if not notification or notification.user_id != user.id:
        raise HTTPException(404, "Notification not found.")

    notification.is_read = True
    db.commit()

    return {"message": "Notification marked as read."}


# ---------------- PROJECTS ----------------

@router.get(
    "/projects",
    response_model=list[ProjectOut],
)
def get_projects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    creator = db.scalar(
        select(Creator).where(Creator.user_id == user.id)
    )

    query = select(Project)

    if user.role == "brand":
        query = query.where(Project.brand_id == user.id)
    elif creator:
        query = query.where(Project.creator_id == creator.id)
    else:
        return []

    return db.scalars(
        query.order_by(Project.created_at.desc())
    ).all()


@router.post(
    "/projects",
    response_model=ProjectOut,
    status_code=201,
)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role != "brand":
        raise HTTPException(
            403,
            "Only brands can create projects.",
        )

    creator = db.get(Creator, data.creator_id)

    if not creator:
        raise HTTPException(404, "Creator not found.")

    if creator.user_id == user.id:
        raise HTTPException(
            400,
            "You cannot assign a project to yourself.",
        )

    if data.brief_id is not None:
        brief = db.get(Brief, data.brief_id)

        if not brief or brief.posted_by != user.id:
            raise HTTPException(404, "Brief not found.")

    project_title = data.title.strip()

    if not project_title:
        raise HTTPException(
            400,
            "Project title cannot be empty.",
        )

    project = Project(
        brand_id=user.id,
        creator_id=creator.id,
        brief_id=data.brief_id,
        title=project_title,
        description=data.description,
        status="pending",
    )

    db.add(project)
    db.flush()

    if creator.user_id:
        db.add(
            Notification(
                user_id=creator.user_id,
                actor_id=user.id,
                notification_type="project",
                message=(
                    f"{user.name} invited you to a project: "
                    f"{project.title}"
                ),
                link="/projects",
            )
        )

    db.commit()
    db.refresh(project)

    return project


@router.patch(
    "/projects/{project_id}/status",
    response_model=ProjectOut,
)
def update_project_status(
    project_id: int,
    data: ProjectStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)

    if not project:
        raise HTTPException(404, "Project not found.")

    creator = db.get(Creator, project.creator_id)

    is_brand = project.brand_id == user.id
    is_creator = (
        creator is not None
        and creator.user_id == user.id
    )

    if not (is_brand or is_creator):
        raise HTTPException(
            403,
            "You cannot update this project.",
        )

    allowed = {
        "pending": {"accepted", "cancelled"},
        "accepted": {"in_progress", "cancelled"},
        "in_progress": {"completed", "cancelled"},
        "completed": set(),
        "cancelled": set(),
    }

    if (
        data.status != project.status
        and data.status not in allowed[project.status]
    ):
        raise HTTPException(
            400,
            (
                f"Cannot change project status from "
                f"{project.status} to {data.status}."
            ),
        )

    project.status = data.status

    recipient_id = (
        creator.user_id
        if is_brand and creator
        else project.brand_id
    )

    if recipient_id and recipient_id != user.id:
        db.add(
            Notification(
                user_id=recipient_id,
                actor_id=user.id,
                notification_type="project_status",
                message=(
                    f"Project '{project.title}' status "
                    f"changed to {data.status}."
                ),
                link="/projects",
            )
        )

    db.commit()
    db.refresh(project)

    return project