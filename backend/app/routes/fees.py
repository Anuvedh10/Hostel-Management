import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Fee, Payment, Student, FeeStatusEnum, User, RoleEnum
from app.schemas import FeeCreate, FeeOut, PaymentCreate, PaymentOut
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/fees", tags=["fees"])


def _to_fee_out(fee: Fee) -> FeeOut:
    return FeeOut(
        id=fee.id,
        student_id=fee.student_id,
        register_number=fee.student.register_number if fee.student else "",
        fee_type=fee.fee_type,
        amount=fee.amount,
        amount_paid=fee.amount_paid,
        due_amount=fee.due_amount,
        due_date=fee.due_date,
        status=fee.status,
    )


@router.get("", response_model=List[FeeOut])
def list_fees(
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Fee)
    if current_user.role == RoleEnum.student:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found")
        query = query.filter(Fee.student_id == student.id)
    elif student_id:
        query = query.filter(Fee.student_id == student_id)
    return [_to_fee_out(f) for f in query.all()]


@router.post("", response_model=FeeOut, status_code=201)
def create_fee(
    payload: FeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.warden, RoleEnum.admin)),
):
    if not db.query(Student).filter(Student.id == payload.student_id).first():
        raise HTTPException(status_code=404, detail="Student not found")
    fee = Fee(**payload.model_dump())
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return _to_fee_out(fee)


@router.post("/pay", response_model=PaymentOut, status_code=201)
def pay_fee(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.warden, RoleEnum.admin)),
):
    fee = db.query(Fee).filter(Fee.id == payload.fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")
    if payload.amount_paid <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if fee.amount_paid + payload.amount_paid > fee.amount + 0.01:
        raise HTTPException(status_code=400, detail="Payment exceeds due amount")

    receipt_number = f"RCPT-{uuid.uuid4().hex[:10].upper()}"
    payment = Payment(
        fee_id=fee.id,
        amount_paid=payload.amount_paid,
        method=payload.method,
        receipt_number=receipt_number,
    )
    db.add(payment)

    fee.amount_paid += payload.amount_paid
    if fee.amount_paid >= fee.amount:
        fee.status = FeeStatusEnum.paid
    elif fee.amount_paid > 0:
        fee.status = FeeStatusEnum.partial

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/{fee_id}/receipt", response_model=List[PaymentOut])
def get_receipts(
    fee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fee = db.query(Fee).filter(Fee.id == fee_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee record not found")
    if current_user.role == RoleEnum.student:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or fee.student_id != student.id:
            raise HTTPException(status_code=403, detail="Not authorized")
    return fee.payments
