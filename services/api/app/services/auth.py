from __future__ import annotations

from datetime import datetime

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.bootstrap import hash_api_key
from app.db.models import APIKey, User
from app.db.session import get_db


def require_api_user(
    x_api_key: str | None = Header(default=None),
    session: Session = Depends(get_db),
) -> User:
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing x-api-key header",
        )
    key_hash = hash_api_key(x_api_key)
    api_key = session.scalar(
        select(APIKey).where(APIKey.hashed_key == key_hash, APIKey.revoked_at.is_(None))
    )
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    user = session.get(User, api_key.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive API user")
    api_key.last_used_at = datetime.utcnow()
    session.commit()
    return user
