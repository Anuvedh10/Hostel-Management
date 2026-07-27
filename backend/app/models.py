import enum
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, ForeignKey, Enum, Boolean, Text
)
from sqlalchemy.orm import relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    student = "student"
    warden = "warden"
    admin = "admin"


class RoomStatusEnum(str, enum.Enum):
    available = "available"
    full = "full"
    maintenance = "maintenance"


class FeeStatusEnum(str, enum.Enum):
    pending = "pending"
    partial = "partial"
    paid = "paid"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(RoleEnum), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student_profile = relationship(
        "Student", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class HostelBlock(Base):
    __tablename__ = "hostel_blocks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    rooms = relationship("Room", back_populates="block")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("hostel_blocks.id"), nullable=False)
    floor = Column(Integer, nullable=False)
    room_number = Column(String(20), nullable=False)
    capacity = Column(Integer, nullable=False, default=2)
    status = Column(Enum(RoomStatusEnum), default=RoomStatusEnum.available)

    block = relationship("HostelBlock", back_populates="rooms")
    students = relationship("Student", back_populates="room")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    register_number = Column(String(30), unique=True, nullable=False)
    department = Column(String(80), nullable=True)
    year = Column(Integer, nullable=True)
    address = Column(Text, nullable=True)
    blood_group = Column(String(5), nullable=True)
    parent_name = Column(String(120), nullable=True)
    parent_phone = Column(String(20), nullable=True)
    emergency_contact = Column(String(20), nullable=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True)
    photo_url = Column(String(255), nullable=True)

    user = relationship("User", back_populates="student_profile")
    room = relationship("Room", back_populates="students")
    fees = relationship("Fee", back_populates="student", cascade="all, delete-orphan")


class Fee(Base):
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    fee_type = Column(String(50), nullable=False)  # admission, hostel, mess, other
    amount = Column(Float, nullable=False)
    amount_paid = Column(Float, default=0.0)
    due_date = Column(Date, nullable=False)
    status = Column(Enum(FeeStatusEnum), default=FeeStatusEnum.pending)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="fees")
    payments = relationship("Payment", back_populates="fee", cascade="all, delete-orphan")

    @property
    def due_amount(self):
        return round(self.amount - self.amount_paid, 2)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    fee_id = Column(Integer, ForeignKey("fees.id"), nullable=False)
    amount_paid = Column(Float, nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)
    method = Column(String(30), default="cash")
    receipt_number = Column(String(40), unique=True, nullable=False)

    fee = relationship("Fee", back_populates="payments")
