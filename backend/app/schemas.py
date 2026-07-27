from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, ConfigDict

from app.models import RoleEnum, RoomStatusEnum, FeeStatusEnum


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: RoleEnum
    full_name: str
    user_id: int


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: RoleEnum = RoleEnum.student
    register_number: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: RoleEnum
    is_active: bool


class CredentialsUpdate(BaseModel):
    """Self-service: any logged-in user changes their own details."""
    current_password: str
    new_username: Optional[str] = None
    new_password: Optional[str] = None
    new_full_name: Optional[str] = None


class AdminCredentialsReset(BaseModel):
    """Admin resets a student's username/password/name without needing their password."""
    new_username: Optional[str] = None
    new_password: Optional[str] = None
    new_full_name: Optional[str] = None


# ---------- Hostel Blocks ----------
class BlockCreate(BaseModel):
    name: str
    description: Optional[str] = None


class BlockOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: Optional[str] = None


# ---------- Rooms ----------
class RoomCreate(BaseModel):
    block_id: int
    floor: int
    room_number: str
    capacity: int = 2


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    block_id: int
    floor: int
    room_number: str
    capacity: int
    status: RoomStatusEnum
    current_occupancy: int = 0


class RoomAllocateRequest(BaseModel):
    student_id: int
    room_id: int


# ---------- Students ----------
class StudentUpdate(BaseModel):
    department: Optional[str] = None
    year: Optional[int] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    phone: Optional[str] = None


class StudentCreate(BaseModel):
    """Admin creates a new student account directly (no self-registration)."""
    username: str
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    register_number: str
    department: Optional[str] = None
    year: Optional[int] = None


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    register_number: str
    department: Optional[str] = None
    year: Optional[int] = None
    address: Optional[str] = None
    blood_group: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    room_id: Optional[int] = None
    full_name: str = ""
    email: str = ""
    username: str = ""
    phone: Optional[str] = None


# ---------- Fees ----------
class FeeCreate(BaseModel):
    student_id: int
    fee_type: str
    amount: float
    due_date: date


class FeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    register_number: str = ""
    fee_type: str
    amount: float
    amount_paid: float
    due_amount: float
    due_date: date
    status: FeeStatusEnum


class PaymentCreate(BaseModel):
    fee_id: int
    amount_paid: float
    method: str = "cash"


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    fee_id: int
    amount_paid: float
    payment_date: datetime
    method: str
    receipt_number: str
