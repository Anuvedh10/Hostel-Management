from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, Token, UserOut, CredentialsUpdate
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token, role=user.role, full_name=user.full_name, user_id=user.id)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/credentials", response_model=UserOut)
def update_my_credentials(
    payload: CredentialsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if payload.new_username and payload.new_username != current_user.username:
        if db.query(User).filter(User.username == payload.new_username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = payload.new_username

    if payload.new_password:
        current_user.hashed_password = hash_password(payload.new_password)

    if payload.new_full_name and payload.new_full_name.strip():
        current_user.full_name = payload.new_full_name.strip()

    if not payload.new_username and not payload.new_password and not payload.new_full_name:
        raise HTTPException(status_code=400, detail="Provide a new username, password, or full name")

    db.commit()
    db.refresh(current_user)
    return current_user
