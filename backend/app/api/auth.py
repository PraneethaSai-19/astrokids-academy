from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_parent
from app.core.config import get_settings
from app.core.rate_limit import client_ip, limiter
from app.core.security import (SCOPE_PARENT, SCOPE_PARENT_GATE, create_token, hash_password,
                               verify_password)
from app.database import get_db, utcnow
from app.models import Child, Parent
from app.schemas import ChildCreate, LoginRequest, PasswordOnly, RegisterRequest, TokenResponse
from app.services.children import child_summary, create_child

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
children_router = APIRouter(prefix="/api/children", tags=["Child profiles"])


def _limit(request: Request, name: str):
    limiter.check(f"{name}:{client_ip(request)}", get_settings().rate_limit_auth_per_minute)


def _token(parent: Parent, scope: str = SCOPE_PARENT) -> dict:
    token, expires = create_token(parent.id, parent.token_version, scope)
    return {"access_token": token, "token_type": "bearer", "expires_in": expires, "scope": scope}


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED,
             summary="Parent registration (optionally with the first child profile)")
def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    _limit(request, "register")
    email = body.email.lower()
    if db.scalar(select(Parent.id).where(func.lower(Parent.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    parent = Parent(email=email, password_hash=hash_password(body.password),
                    display_name=body.display_name.strip(), last_login_at=utcnow())
    db.add(parent)
    db.flush()
    if body.child:
        create_child(db, parent, body.child.nickname, body.child.age_group)
    db.commit()
    return _token(parent)


@router.post("/login", response_model=TokenResponse, summary="Parent login")
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    _limit(request, "login")
    parent = db.scalar(select(Parent).where(func.lower(Parent.email) == body.email.lower()))
    if parent is None or not verify_password(body.password, parent.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Email or password is not correct.")
    parent.last_login_at = utcnow()
    db.commit()
    return _token(parent)


@router.post("/logout", summary="Log out everywhere (invalidates all existing tokens)")
def logout(parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    parent.token_version += 1
    db.commit()
    return {"message": "Logged out. See you next mission!"}


@router.post("/parent-gate", response_model=TokenResponse,
             summary="Re-enter the parent password to get a short-lived token for the parent dashboard")
def parent_gate(body: PasswordOnly, request: Request, parent: Parent = Depends(get_current_parent)):
    _limit(request, "gate")
    if not verify_password(body.password, parent.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="That password is not correct.")
    return _token(parent, SCOPE_PARENT_GATE)


@router.get("/me", summary="Current parent account and child profiles")
def me(parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    return {"id": parent.id, "email": parent.email, "display_name": parent.display_name,
            "children": [child_summary(db, c) for c in parent.children]}


@children_router.get("", summary="List child profiles for the logged-in parent")
def list_children(parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    return [child_summary(db, c) for c in parent.children]


@children_router.post("", status_code=status.HTTP_201_CREATED, summary="Create a child profile")
def add_child(body: ChildCreate, parent: Parent = Depends(get_current_parent), db: Session = Depends(get_db)):
    child = create_child(db, parent, body.nickname, body.age_group)
    db.commit()
    db.refresh(child)
    return child_summary(db, db.get(Child, child.id))
