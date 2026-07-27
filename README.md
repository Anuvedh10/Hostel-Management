# Smart Hostel Management System — Core Module

A working full-stack app covering the core of the original spec: **authentication
(JWT, 3 roles), student management, room management, fee management, and
role-based dashboards.** Complaints, leave, attendance, visitors, notices, and
mess management are not included in this build — see "Extending it" below.

## Stack

- **Backend:** FastAPI + SQLAlchemy, JWT auth (`python-jose`), password hashing (`bcrypt`)
- **Database:** SQLite by default (zero setup). Swap to PostgreSQL by setting `DATABASE_URL`.
- **Frontend:** Vanilla HTML/CSS/JS single-page app, served directly by FastAPI — no build step, no Node required.

## Project layout

```
hostel_management/
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app, router wiring, serves frontend/
│   │   ├── database.py     # SQLAlchemy engine/session
│   │   ├── models.py       # User, Student, HostelBlock, Room, Fee, Payment
│   │   ├── schemas.py      # Pydantic request/response models
│   │   ├── auth.py         # password hashing, JWT issuing/verification
│   │   ├── seed.py         # demo accounts + sample data
│   │   └── routes/
│   │       ├── auth.py       # /api/auth/login, /register, /me
│   │       ├── students.py   # /api/students
│   │       ├── rooms.py      # /api/rooms, /api/blocks
│   │       ├── fees.py       # /api/fees, /api/fees/pay
│   │       └── dashboard.py  # /api/dashboard/{student,warden,admin}
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

## Run it

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create demo accounts + sample rooms/fees
python -m app.seed

# Start the server (also serves the frontend at the same address)
uvicorn app.main:app --reload
```

Open **http://127.0.0.1:8000** in your browser.

### Demo accounts (created by `seed.py`)

| Username | Password  | Role    |
|----------|-----------|---------|
| admin    | admin123  | admin   |
| warden1  | warden123 | warden  |
| priya    | priya123  | student |
| rahul    | rahul123  | student |
| sneha    | sneha123  | student |

New students can also self-register from the login screen ("New student? Register here").

## What each role can do

**Student:** dashboard (room, fee due), view/edit own profile, view fees and payment receipts.

**Warden:** dashboard (occupancy, pending fees), search/view students, allocate or vacate rooms, view all rooms, view/create fee records and record payments.

**Admin:** everything a warden can do, plus create hostel blocks and rooms, and see revenue/occupancy analytics.

## Switching to PostgreSQL

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/hostel_db"
pip install psycopg2-binary
python -m app.seed
uvicorn app.main:app --reload
```

## API docs

FastAPI auto-generates interactive docs — once the server is running, visit
**http://127.0.0.1:8000/docs**.

## Security notes for this build

- `SECRET_KEY` in `app/auth.py` defaults to a dev value — set the `SECRET_KEY`
  environment variable to a strong random value before any real deployment.
- Passwords are hashed with bcrypt; never stored in plaintext.
- All non-login endpoints require a valid JWT; role checks are enforced
  server-side per endpoint (not just hidden in the UI).
- Tables are auto-created on startup via `Base.metadata.create_all`, which is
  fine for SQLite/dev. For production with PostgreSQL, replace this with
  Alembic migrations so schema changes are tracked.

## Extending it

The models and folder structure are intentionally left room to grow into the
full original spec:

- **Complaints / Leave / Attendance / Visitors / Notices / Mess:** add a
  SQLAlchemy model + Pydantic schema + router per module, following the same
  pattern as `fees.py`. Add the matching nav item and a `render*()` function
  in `app.js`.
- **PDF/Excel reports:** add `reportlab` / `openpyxl` to `requirements.txt`
  and a `/api/reports/*` router that streams a generated file.
- **QR codes / email notifications:** add `qrcode` / `smtplib`-based
  utilities called from the relevant route (e.g. visitor approval, fee
  reminders).
