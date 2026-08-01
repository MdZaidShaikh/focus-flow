import json
from urllib.request import urlopen
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk
from jose.utils import base64url_decode
from sqlalchemy.orm import Session
from pydantic_settings import BaseSettings

from app.db.session import get_db
from app.models.db_models import User
import uuid


# A simple wrapper to read Cognito settings.
# In a real app, this might be in a central config file.
class CognitoSettings(BaseSettings):
    cognito_region: str = ""
    cognito_user_pool_id: str = ""
    cognito_app_client_id: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = CognitoSettings()
security = HTTPBearer()

# Cache the JWKS so we don't fetch it on every request
_jwks = None


def get_jwks():
    global _jwks
    if _jwks is None and settings.cognito_region and settings.cognito_user_pool_id:
        url = f"https://cognito-idp.{settings.cognito_region}.amazonaws.com/{settings.cognito_user_pool_id}/.well-known/jwks.json"
        try:
            with urlopen(url) as response:
                _jwks = json.loads(response.read())
        except Exception as e:
            print(f"Error fetching JWKS: {e}")
            _jwks = {}
    return _jwks or {}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials

    if not settings.cognito_user_pool_id:
        # Fallback for local development if Cognito is not configured
        # Uses the hardcoded placeholder user to prevent blocking development.
        from app.api.routes.sessions import PLACEHOLDER_USER_ID

        user = db.query(User).filter(User.id == PLACEHOLDER_USER_ID).first()
        if not user:
            raise HTTPException(status_code=404, detail="Placeholder user not found")
        return user

    try:
        headers = jwt.get_unverified_headers(token)
        kid = headers.get("kid")

        jwks = get_jwks()
        key = next((k for k in jwks.get("keys", []) if k["kid"] == kid), None)

        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Public key not found in JWKS",
            )

        public_key = jwk.construct(key)

        message, encoded_signature = str(token).rsplit(".", 1)
        decoded_signature = base64url_decode(encoded_signature.encode("utf-8"))

        if not public_key.verify(message.encode("utf8"), decoded_signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Signature verification failed",
            )

        claims = jwt.get_unverified_claims(token)

        # Verify expiration
        import time

        if time.time() > claims["exp"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is expired",
            )

        # Verify audience/client_id
        if "aud" in claims and claims["aud"] != settings.cognito_app_client_id:
            if (
                "client_id" in claims
                and claims["client_id"] != settings.cognito_app_client_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token audience invalid",
                )

        cognito_sub = claims["sub"]
        email = claims.get("email", "")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )

    # Get or create the user based on the Cognito sub
    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if not user:
        user = User(id=str(uuid.uuid4()), cognito_sub=cognito_sub, email=email)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
