from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine, SessionLocal
from app.models import User
from app.routes import auth, students, rooms, fees, dashboard

# Create tables on startup (fine for SQLite dev use; for PostgreSQL in
# production, use Alembic migrations instead as described in the README).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Hostel Management System",
    description="Core module: authentication, students, rooms, fees, dashboards.",
    version="1.0.0",
)


@app.on_event("startup")
def auto_seed_if_empty():
    """
    Populate demo accounts/data automatically on first boot against an empty
    database (e.g. a freshly created hosted Postgres instance where there's
    no shell access to run `python -m app.seed` manually, such as Render's
    free tier). Safe to run on every startup: it's a no-op once any user
    already exists.
    """
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            from app.seed import run as seed_run
            seed_run()
    finally:
        db.close()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(rooms.router)
app.include_router(rooms.blocks_router)
app.include_router(fees.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
