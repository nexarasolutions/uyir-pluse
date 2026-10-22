import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
from fastapi import HTTPException, status
from sqlalchemy import text
from app.config import settings
from app.db import require_db
from app.schemas import UserSignUp, UserLogin, UserOut, TokenResponse


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(
    user_id: str,
    email: str,
    role: str = "authenticated",
    custom_claims: Optional[dict] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates a standard Supabase-compliant signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)

    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": role,
        "iss": "supabase",
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "app_metadata": {
            "provider": "email",
            "providers": ["email"],
        },
        "user_metadata": {
            "role": role,
        },
    }
    if custom_claims:
        payload.update(custom_claims)

    encoded = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded


def decode_access_token(token: str) -> dict:
    """Decodes and validates a Supabase JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def signup_user(payload: UserSignUp) -> TokenResponse:
    """Registers a new user in Supabase auth.users and public.profiles."""
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email address format.")
    if len(payload.password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters.")

    db = require_db()
    try:
        # 1. Check if user already exists
        existing = db.execute(
            text("SELECT id FROM auth.users WHERE LOWER(email) = :email"),
            {"email": email},
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account with email '{email}' already exists. Please sign in instead.",
            )

        user_id = str(uuid.uuid4())
        hashed = hash_password(payload.password)
        now = datetime.now(timezone.utc)
        full_name = (payload.full_name or "").strip() or None
        user_role = payload.role or "patient"

        # 2. Insert into auth.users (Supabase native Auth)
        meta_json = json.dumps({"full_name": full_name or "", "role": user_role})
        db.execute(
            text("""
            INSERT INTO auth.users (
                id, email, encrypted_password, aud, role, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data, created_at, updated_at
            ) VALUES (
                :id, :email, :password, 'authenticated', 'authenticated', :now,
                CAST('{"provider":"email","providers":["email"]}' AS jsonb),
                CAST(:meta AS jsonb),
                :now, :now
            )
            """),
            {
                "id": user_id,
                "email": email,
                "password": hashed,
                "now": now,
                "meta": meta_json,
            },
        )

        # 3. Insert into public.profiles
        try:
            with db.begin_nested():
                db.execute(
                    text("""
                    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
                    VALUES (:id, :email, :full_name, :role, :now, :now)
                    ON CONFLICT (id) DO UPDATE SET
                        email = EXCLUDED.email,
                        full_name = EXCLUDED.full_name,
                        role = EXCLUDED.role,
                        updated_at = EXCLUDED.updated_at
                    """),
                    {
                        "id": user_id,
                        "email": email,
                        "full_name": full_name,
                        "role": user_role,
                        "now": now,
                    },
                )
        except Exception:
            pass

        db.commit()

        # 4. Generate token
        token = create_access_token(user_id=user_id, email=email, role=user_role)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            user=UserOut(
                id=user_id,
                email=email,
                full_name=full_name,
                role=user_role,
                created_at=now.isoformat(),
                last_sign_in_at=now.isoformat(),
            ),
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user account: {str(e)}",
        ) from e
    finally:
        db.close()


def login_user(payload: UserLogin) -> TokenResponse:
    """Authenticates a user against Supabase auth.users and returns a JWT."""
    email = payload.email.strip().lower()
    db = require_db()
    try:
        row = db.execute(
            text("""
            SELECT id, email, encrypted_password, raw_user_meta_data, created_at
            FROM auth.users
            WHERE LOWER(email) = :email
            """),
            {"email": email},
        ).mappings().first()

        if not row or not row["encrypted_password"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or password.",
            )

        if not verify_password(payload.password, row["encrypted_password"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email or password.",
            )

        # Update last_sign_in_at
        now = datetime.now(timezone.utc)
        db.execute(
            text("UPDATE auth.users SET last_sign_in_at = :now, updated_at = :now WHERE id = :id"),
            {"now": now, "id": row["id"]},
        )
        db.commit()

        # Check profiles table for updated metadata
        full_name = None
        role = "patient"
        meta = row.get("raw_user_meta_data") or {}
        if isinstance(meta, dict):
            full_name = meta.get("full_name")
            role = meta.get("role", "patient")

        try:
            p_row = db.execute(
                text("SELECT full_name, role FROM public.profiles WHERE id = :id"),
                {"id": row["id"]},
            ).mappings().first()
            if p_row:
                if p_row.get("full_name"):
                    full_name = p_row["full_name"]
                if p_row.get("role"):
                    role = p_row["role"]
        except Exception:
            pass

        token = create_access_token(user_id=str(row["id"]), email=row["email"], role=role)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            user=UserOut(
                id=str(row["id"]),
                email=row["email"],
                full_name=full_name,
                role=role,
                created_at=row["created_at"].isoformat() if row.get("created_at") else None,
                last_sign_in_at=now.isoformat(),
            ),
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login verification failed: {str(e)}",
        ) from e
    finally:
        db.close()


def get_user_profile(user_id: str) -> UserOut:
    """Retrieves user profile information by Supabase UUID."""
    db = require_db()
    try:
        row = db.execute(
            text("""
            SELECT id, email, raw_user_meta_data, created_at, last_sign_in_at
            FROM auth.users
            WHERE id = :id
            """),
            {"id": user_id},
        ).mappings().first()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID '{user_id}' not found.",
            )

        full_name = None
        role = "patient"
        meta = row.get("raw_user_meta_data") or {}
        if isinstance(meta, dict):
            full_name = meta.get("full_name")
            role = meta.get("role", "patient")

        try:
            p_row = db.execute(
                text("SELECT full_name, role FROM public.profiles WHERE id = :id"),
                {"id": user_id},
            ).mappings().first()
            if p_row:
                if p_row.get("full_name"):
                    full_name = p_row["full_name"]
                if p_row.get("role"):
                    role = p_row["role"]
        except Exception:
            pass

        return UserOut(
            id=str(row["id"]),
            email=row["email"],
            full_name=full_name,
            role=role,
            created_at=row["created_at"].isoformat() if row.get("created_at") else None,
            last_sign_in_at=row["last_sign_in_at"].isoformat() if row.get("last_sign_in_at") else None,
        )
    finally:
        db.close()


def request_password_reset(email: str) -> dict:
    """Registers password recovery request for given email."""
    cleaned_email = email.strip().lower()
    db = require_db()
    try:
        row = db.execute(
            text("SELECT id FROM auth.users WHERE LOWER(email) = :email"),
            {"email": cleaned_email},
        ).mappings().first()

        if row:
            now = datetime.now(timezone.utc)
            token = str(uuid.uuid4())
            db.execute(
                text("UPDATE auth.users SET recovery_token = :token, recovery_sent_at = :now WHERE id = :id"),
                {"token": token, "now": now, "id": row["id"]},
            )
            db.commit()

        # Always return 200 to avoid email enumeration
        return {
            "success": True,
            "message": f"If an account is associated with {cleaned_email}, password reset instructions have been dispatched.",
        }
    finally:
        db.close()
