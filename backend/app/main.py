from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routes import auth, students, rooms, fees, dashboard

# Create tables on startup (fine for SQLite dev use; for PostgreSQL in
# production, use Alembic migrations instead as described in the README).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Hostel Management System",
    description="Core module: authentication, students, rooms, fees, dashboards.",
    version="1.0.0",
)

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
