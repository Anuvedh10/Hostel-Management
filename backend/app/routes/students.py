from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Student, User, RoleEnum
from app.schemas import StudentOut, StudentUpdate, StudentCreate, AdminCredentialsReset
from app.auth import get_current_user, require_roles, hash_password

router = APIRouter(prefix="/api/students", tags=["students"])


def _to_student_out(student: Student) -> StudentOut:
    return StudentOut(
        id=student.id,
        user_id=student.user_id,
        register_number=student.register_number,
        department=student.department,
        year=student.year,
        address=student.address,
        blood_group=student.blood_group,
        parent_name=student.parent_name,
        parent_phone=student.parent_phone,
        emergency_contact=student.emergency_contact,
        room_id=student.room_id,
        full_name=student.user.full_name,
        email=student.user.email,
        username=student.user.username,
        phone=student.user.phone,
    )


@router.get("", response_model=List[StudentOut])
def list_students(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.warden, RoleEnum.admin)),
):
    query = db.query(Student).join(User)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(like)) | (Student.register_number.ilike(like))
        )
    students = query.all()
    return [_to_student_out(s) for s in students]


@router.get("/me", response_model=StudentOut)
def my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.student)),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return _to_student_out(student)


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if db.query(Student).filter(Student.register_number == payload.register_number).first():
        raise HTTPException(status_code=400, detail="Register number already exists")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=RoleEnum.student,
    )
    db.add(user)
    db.flush()

    student = Student(
        user_id=user.id,
        register_number=payload.register_number,
        department=payload.department,
        year=payload.year,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return _to_student_out(student)


@router.put("/me", response_model=StudentOut)
def update_my_profile(
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.student)),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    data = payload.model_dump(exclude_unset=True)
    if "phone" in data:
        current_user.phone = data.pop("phone")
    for field, value in data.items():
        setattr(student, field, value)

    db.commit()
    db.refresh(student)
    return _to_student_out(student)


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.warden, RoleEnum.admin)),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return _to_student_out(student)


@router.put("/{student_id}/credentials", response_model=StudentOut)
def admin_reset_student_credentials(
    student_id: int,
    payload: AdminCredentialsReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    user = student.user
    if payload.new_username and payload.new_username != user.username:
        if db.query(User).filter(User.username == payload.new_username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = payload.new_username

    if payload.new_password:
        user.hashed_password = hash_password(payload.new_password)

    if payload.new_full_name and payload.new_full_name.strip():
        user.full_name = payload.new_full_name.strip()

    if not payload.new_username and not payload.new_password and not payload.new_full_name:
        raise HTTPException(status_code=400, detail="Provide a new username, password, or full name")

    db.commit()
    db.refresh(student)
    return _to_student_out(student)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    user = student.user
    db.delete(student)
    db.delete(user)
    db.commit()
