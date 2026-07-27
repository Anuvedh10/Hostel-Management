from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Room, Student, HostelBlock, RoomStatusEnum, User, RoleEnum
from app.schemas import RoomCreate, RoomOut, RoomAllocateRequest, BlockCreate, BlockOut
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/rooms", tags=["rooms"])
blocks_router = APIRouter(prefix="/api/blocks", tags=["blocks"])


def _to_room_out(room: Room) -> RoomOut:
    return RoomOut(
        id=room.id,
        block_id=room.block_id,
        floor=room.floor,
        room_number=room.room_number,
        capacity=room.capacity,
        status=room.status,
        current_occupancy=len(room.students),
    )


@router.get("", response_model=List[RoomOut])
def list_rooms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rooms = db.query(Room).all()
    return [_to_room_out(r) for r in rooms]


@router.post("", response_model=RoomOut, status_code=201)
def create_room(
    payload: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    if not db.query(HostelBlock).filter(HostelBlock.id == payload.block_id).first():
        raise HTTPException(status_code=404, detail="Hostel block not found")
    room = Room(**payload.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return _to_room_out(room)


@router.post("/allocate", response_model=RoomOut)
def allocate_room(
    payload: RoomAllocateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.warden, RoleEnum.admin)),
):
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    room = db.query(Room).filter(Room.id == payload.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if len(room.students) >= room.capacity:
        raise HTTPException(status_code=400, detail="Room is at full capacity")

    student.room_id = room.id
    if len(room.students) + 1 >= room.capacity:
        room.status = RoomStatusEnum.full
    db.commit()
    db.refresh(room)
    return _to_room_out(room)


@router.post("/vacate/{student_id}", status_code=204)
def vacate_room(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.warden, RoleEnum.admin)),
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student or not student.room_id:
        raise HTTPException(status_code=404, detail="Student has no allocated room")
    room = student.room
    student.room_id = None
    room.status = RoomStatusEnum.available
    db.commit()


@blocks_router.get("", response_model=List[BlockOut])
def list_blocks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(HostelBlock).all()


@blocks_router.post("", response_model=BlockOut, status_code=201)
def create_block(
    payload: BlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.admin)),
):
    if db.query(HostelBlock).filter(HostelBlock.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Block already exists")
    block = HostelBlock(**payload.model_dump())
    db.add(block)
    db.commit()
    db.refresh(block)
    return block
