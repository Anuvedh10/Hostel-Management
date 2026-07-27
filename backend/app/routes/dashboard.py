from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Student, Room, Fee, User, RoleEnum, FeeStatusEnum
from app.auth import require_roles

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/student")
def student_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.student)),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    fees = db.query(Fee).filter(Fee.student_id == student.id).all()
    total_due = round(sum(f.due_amount for f in fees), 2)

    room_info = None
    if student.room:
        room_info = {
            "block": student.room.block.name,
            "floor": student.room.floor,
            "room_number": student.room.room_number,
            "capacity": student.room.capacity,
            "occupancy": len(student.room.students),
        }

    return {
        "full_name": current_user.full_name,
        "register_number": student.register_number,
        "room": room_info,
        "total_fee_due": total_due,
        "fee_count": len(fees),
        "pending_fees": len([f for f in fees if f.status != FeeStatusEnum.paid]),
    }


@router.get("/warden")
def warden_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.warden, RoleEnum.admin)),
):
    total_students = db.query(Student).count()
    rooms = db.query(Room).all()
    occupied = sum(len(r.students) for r in rooms)
    capacity = sum(r.capacity for r in rooms)
    occupancy_by_block = {}
    for r in rooms:
        occupancy_by_block.setdefault(r.block.name, {"occupied": 0, "capacity": 0})
        occupancy_by_block[r.block.name]["occupied"] += len(r.students)
        occupancy_by_block[r.block.name]["capacity"] += r.capacity

    pending_fee_students = (
        db.query(Fee.student_id).filter(Fee.status != FeeStatusEnum.paid).distinct().count()
    )

    return {
        "total_students": total_students,
        "total_rooms": len(rooms),
        "occupied_beds": occupied,
        "total_capacity": capacity,
        "occupancy_by_block": occupancy_by_block,
        "students_with_pending_fees": pending_fee_students,
    }


@router.get("/admin")
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    total_students = db.query(Student).count()
    total_wardens = db.query(User).filter(User.role == RoleEnum.warden).count()
    rooms = db.query(Room).all()
    occupied = sum(len(r.students) for r in rooms)
    capacity = sum(r.capacity for r in rooms)

    revenue = db.query(func.sum(Fee.amount_paid)).scalar() or 0
    total_billed = db.query(func.sum(Fee.amount)).scalar() or 0
    outstanding = round(total_billed - revenue, 2)

    fee_type_breakdown = (
        db.query(Fee.fee_type, func.sum(Fee.amount_paid))
        .group_by(Fee.fee_type)
        .all()
    )

    return {
        "total_students": total_students,
        "total_wardens": total_wardens,
        "total_rooms": len(rooms),
        "occupied_beds": occupied,
        "total_capacity": capacity,
        "occupancy_rate": round((occupied / capacity) * 100, 1) if capacity else 0,
        "total_revenue": round(revenue, 2),
        "outstanding_dues": outstanding,
        "revenue_by_fee_type": {ft: round(amt, 2) for ft, amt in fee_type_breakdown},
    }
