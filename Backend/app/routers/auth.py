from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Creator, Tool, User
from ..schemas import LoginIn, SignupIn, TokenOut, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User) -> TokenOut:
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


def _get_or_create_tool(db: Session, name: str) -> Tool:
    name = name.strip()[:60]
    tool = db.scalar(select(Tool).where(Tool.name == name))
    if tool is None:
        tool = Tool(name=name)
        db.add(tool)
        db.flush()
    return tool


@router.post("/signup", response_model=TokenOut, status_code=201)
def signup(data: SignupIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role=data.role,
        company=(data.company or "").strip() or None if data.role == "brand" else None,
    )
    db.add(user)

    if data.role == "creator":
        creator = Creator(user=user, name=user.name, headline="AI creator")
        tools = {}
        for raw in data.tools:
            if raw.strip():
                tool = _get_or_create_tool(db, raw)
                tools[tool.id] = tool
        creator.tools = list(tools.values())
        db.add(creator)

    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user