
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User

router = APIRouter(prefix="/brand", tags=["Brand Profile"])


class BrandProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    company: str | None = Field(default=None, max_length=200)


@router.get("/profile")
def get_brand_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "brand":
        raise HTTPException(status_code=403, detail="Brand account required")

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "company": current_user.company,
        "role": current_user.role,
    }


@router.put("/profile")
def update_brand_profile(
    payload: BrandProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "brand":
        raise HTTPException(status_code=403, detail="Brand account required")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be empty")
        current_user.name = name

    if payload.company is not None:
        current_user.company = payload.company.strip()

    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "company": current_user.company,
        "role": current_user.role,
    }