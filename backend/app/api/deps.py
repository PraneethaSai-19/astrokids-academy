"""Authentication and authorization dependencies."""
import jwt
from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import SCOPE_PARENT, SCOPE_PARENT_GATE, decode_token
from app.database import get_db
from app.models import Child, Parent

bearer = HTTPBearer(auto_error=False)


def _unauthorized(msg: str = "Please log in again.") -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail=msg, headers={"WWW-Authenticate": "Bearer"})


def _parent_from_token(creds: HTTPAuthorizationCredentials | None, db: Session, allowed_scopes: set[str]) -> Parent:
    if creds is None or creds.scheme.lower() != "bearer":
        raise _unauthorized("You need to log in first.")
    try:
        payload = decode_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Your session has expired. Please log in again.")
    except jwt.PyJWTError:
        raise _unauthorized("Invalid login token.")
    if payload.get("scope") not in allowed_scopes:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="A grown-up needs to unlock this area.")
    try:
        parent_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise _unauthorized("Invalid login token.")
    parent = db.get(Parent, parent_id)
    if parent is None or payload.get("ver") != parent.token_version:
        raise _unauthorized("Your session has ended. Please log in again.")
    return parent


def get_current_parent(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> Parent:
    """Any valid session (normal app token or parent-gate token)."""
    return _parent_from_token(creds, db, {SCOPE_PARENT, SCOPE_PARENT_GATE})


def get_gated_parent(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)
) -> Parent:
    """Parent-only area: requires the short-lived token issued after re-entering the password."""
    return _parent_from_token(creds, db, {SCOPE_PARENT_GATE})


def get_owned_child(
    child_id: int = Path(..., ge=1),
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
) -> Child:
    child = db.get(Child, child_id)
    if child is None or child.parent_id != parent.id:
        # Same response for "missing" and "not yours" so profiles are never exposed.
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Astronaut profile not found.")
    return child


def get_gated_child(
    child_id: int = Path(..., ge=1),
    parent: Parent = Depends(get_gated_parent),
    db: Session = Depends(get_db),
) -> Child:
    child = db.get(Child, child_id)
    if child is None or child.parent_id != parent.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Astronaut profile not found.")
    return child
