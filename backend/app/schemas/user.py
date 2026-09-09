from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role_id: int
    team_id: int | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    role_id: int | None = None
    team_id: int | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role_id: int
    team_id: int | None
    is_active: bool

    class Config:
        from_attributes = True