"""
Populates the database with demo accounts and sample data so the app
is immediately usable after setup.

Run standalone with:  python -m app.seed
Also called automatically from app/main.py on startup if the database
has no users yet (e.g. first boot on a freshly hosted Postgres instance
with no shell access to run this manually).
"""
from datetime import date, timedelta

from app.database import Base, engine, SessionLocal
from app.models import (
    User, Student, HostelBlock, Room, Fee, RoleEnum, RoomStatusEnum
)
from app.auth import hash_password


def _get_or_create_user(db, username, email, password, full_name, role, phone=None):
    user = db.query(User).filter(User.username == username).first()
    if user:
        return user
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=role,
        phone=phone,
    )
    db.add(user)
    db.flush()
    return user


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("Seeding demo data...")

        _get_or_create_user(db, "admin", "admin@hostel-demo.com", "admin123", "Ananya Rao", RoleEnum.admin, "9000000001")
        _get_or_create_user(db, "warden1", "warden1@hostel-demo.com", "warden123", "Suresh Kumar", RoleEnum.warden, "9000000002")

        block_a = db.query(HostelBlock).filter(HostelBlock.name == "Block A").first()
        if not block_a:
            block_a = HostelBlock(name="Block A", description="Main block, ground + 3 floors")
            db.add(block_a)
            db.flush()

        block_b = db.query(HostelBlock).filter(HostelBlock.name == "Block B").first()
        if not block_b:
            block_b = HostelBlock(name="Block B", description="Annex block")
            db.add(block_b)
            db.flush()

        rooms_data = [
            (block_a.id, 1, "A101", 2), (block_a.id, 1, "A102", 2),
            (block_a.id, 2, "A201", 3), (block_b.id, 1, "B101", 2),
            (block_b.id, 2, "B201", 2),
        ]
        rooms = []
        for block_id, floor, number, cap in rooms_data:
            room = db.query(Room).filter(Room.room_number == number).first()
            if not room:
                room = Room(block_id=block_id, floor=floor, room_number=number, capacity=cap)
                db.add(room)
                db.flush()
            rooms.append(room)

        students_data = [
            ("priya", "priya@hostel-demo.com", "priya123", "Priya Sharma", "REG2024001", "CSE", 2),
            ("rahul", "rahul@hostel-demo.com", "rahul123", "Rahul Verma", "REG2024002", "ECE", 3),
            ("sneha", "sneha@hostel-demo.com", "sneha123", "Sneha Iyer", "REG2024003", "MECH", 1),
        ]

        # Keyed by username instead of positional list indexing, so this is
        # safe to re-run against a database that already has some (but not
        # all) of this data in it.
        students_by_username = {}
        for username, email, pw, name, reg, dept, year in students_data:
            user = _get_or_create_user(db, username, email, pw, name, RoleEnum.student)
            student = db.query(Student).filter(Student.user_id == user.id).first()
            if not student:
                # Register number might already belong to a different user_id
                # from a previous partial run; reuse that record defensively
                # instead of hitting a UNIQUE constraint error.
                student = db.query(Student).filter(Student.register_number == reg).first()
            if not student:
                student = Student(user_id=user.id, register_number=reg, department=dept, year=year)
                db.add(student)
                db.flush()
            students_by_username[username] = student

        priya, rahul, sneha = students_by_username["priya"], students_by_username["rahul"], students_by_username["sneha"]

        if priya.room_id is None:
            priya.room_id = rooms[0].id
        if rahul.room_id is None:
            rahul.room_id = rooms[0].id
        if sneha.room_id is None:
            sneha.room_id = rooms[2].id

        for room in rooms:
            if len(room.students) >= room.capacity:
                room.status = RoomStatusEnum.full

        for student in students_by_username.values():
            existing = db.query(Fee).filter(Fee.student_id == student.id).first()
            if existing:
                continue
            db.add(Fee(student_id=student.id, fee_type="admission", amount=15000,
                        due_date=date.today() + timedelta(days=30)))
            db.add(Fee(student_id=student.id, fee_type="hostel", amount=45000,
                        due_date=date.today() + timedelta(days=30)))

        db.commit()
        print("Done. Demo accounts:")
        print("  admin    / admin123   (admin)")
        print("  warden1  / warden123  (warden)")
        print("  priya    / priya123   (student)")
        print("  rahul    / rahul123   (student)")
        print("  sneha    / sneha123   (student)")
    finally:
        db.close()


if __name__ == "__main__":
    run()
