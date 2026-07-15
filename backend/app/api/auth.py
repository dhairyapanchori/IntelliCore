from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core import security, config
from app.core.database import get_db
from app.models.core import User, Organization, OrganizationUser, Workspace, Department
from app.schemas.user import UserCreate, User as UserSchema, Token
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/signup", response_model=UserSchema)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        # Auto-provision hierarchy
        org = Organization(name="My Organization")
        db.add(org)
        db.commit()
        db.refresh(org)

        org_user = OrganizationUser(
            organization_id=org.id,
            user_id=user.id,
            role="owner"
        )
        db.add(org_user)
        db.commit()

        workspace = Workspace(
            name="Global Workspace",
            description="Default workspace for all your documents.",
            organization_id=org.id,
            owner_id=user.id,
            type="Private"
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)

        department = Department(
            name="General",
            description="General department.",
            workspace_id=workspace.id,
            head_id=user.id
        )
        db.add(department)
        db.commit()

        return user
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        raise HTTPException(status_code=500, detail=str(error_msg))

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=400, detail="Incorrect email or password"
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
def get_user_me(current_user: User = Depends(get_current_user)):
    return current_user
