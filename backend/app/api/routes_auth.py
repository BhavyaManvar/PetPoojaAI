"""Auth verification endpoint — validates Firebase ID tokens and returns user role."""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

router = APIRouter()


class VerifyRequest(BaseModel):
    token: str


class VerifyResponse(BaseModel):
    uid: str
    email: str | None = None
    role: str = "customer"


@router.post("/verify", response_model=VerifyResponse)
async def verify_token(body: VerifyRequest, authorization: str = Header(default="")):
    """Verify a Firebase ID token and return the user's role.

    In production this would use firebase-admin to decode the token.
    For the demo/dev environment we decode the token without verification
    so the backend can run without Firebase Admin credentials.
    """
    token = body.token
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    # --- lightweight decode (dev / demo) ---
    # Firebase ID tokens are JWTs.  We decode the payload to extract
    # uid and email without cryptographic verification.  This is fine for
    # a local demo; for production you would use firebase_admin.auth.
    try:
        import base64, json

        parts = token.split(".")
        if len(parts) < 2:
            raise ValueError("Invalid JWT structure")
        # JWT base64url → standard base64
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        uid = payload.get("user_id") or payload.get("sub", "")
        email = payload.get("email")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Determine role — check against admin list in settings
    from app.config import settings

    role = "customer"
    if email and email in settings.ADMIN_EMAILS:
        role = "admin"

    return VerifyResponse(uid=uid, email=email, role=role)
