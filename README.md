# SYNapse Medical Facility Portal

Comprehensive full-stack medical facility portal for IIT Ropar featuring multi-role authentication (Patient / Student, Doctor, Pharmacist, Admin), OPD consultation queues, prescription management, and public appointment booking.

## Architecture

- **Backend**: Django 5.1 + Django REST Framework + SimpleJWT (located in `synapse-backend/`)
- **Frontend**: React 19 + Vite 8 + React Router 7 (located in `synapse-frontend/`)
- **API Proxy**: Vite dev server proxies `/api` directly to `http://127.0.0.1:8000`, eliminating CORS issues during development.

---

## Quick Start Guide

### 1. Start the Django Backend

```powershell
cd synapse-backend

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Run the Django development server (starts on http://127.0.0.1:8000)
python manage.py runserver 8000
```

### 2. Start the Frontend Dev Server

In a new terminal:

```powershell
cd synapse-frontend

# Run the Vite development server (starts on http://localhost:5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Demo Credentials & Quick Logins

The login page at `/login` provides one-click quick demo buttons and accepts any of the following credentials (password: `demo@123`):

| Role | User ID / Roll No | Email | Password | Details |
|---|---|---|---|---|
| **Patient** | `p-101` or `2026AIM1007` | `student@iitrpr.ac.in` | `demo@123` | Aarav Sharma (M.Tech AI) |
| **Doctor** | `doc-201` | `doctor@iitrpr.ac.in` | `demo@123` | Dr. Doom (OPD Room 102) |
| **Pharmacist** | `ph-301` | `pharmacist@iitrpr.ac.in` | `demo@123` | Rohan Verma (Pharmacy Desk) |
| **Admin** | `admin` | `admin@iitrpr.ac.in` | `admin@123` | Portal Administrator |

---

## Integrated API Endpoints

- **Authentication**:
  - `POST /api/auth/login/`: Flexible login supporting Email, Student Roll Number, or Demo Alias. Returns JWT `access`, `refresh`, and user profile data.
  - `POST /api/auth/refresh/`: JWT silent token refresh.
  - `POST /api/auth/logout/`: Token blacklisting.
  - `GET /api/accounts/me/`: Current user session details.
- **Patient Services**:
  - `GET /api/accounts/profile/student/` & `PATCH /api/accounts/profile/student/`: Student profile view and updates.
  - `GET /api/clinical/appointments/my/`: Patient upcoming appointment details.
  - `GET /api/clinical/history/`: Historical visits with complaints, diagnosis, and prescribed medicines. Filterable by `date`, `doctor`, `medicine`.
  - `GET /api/clinical/availability/`: Doctor availability schedules.
- **Doctor Services**:
  - `GET /api/accounts/profile/doctor/`: Doctor profile info.
  - `GET /api/clinical/queue/`: Live daily consultation queue with token numbers and emergency priority.
  - `PATCH /api/clinical/appointments/<id>/status/`: Appointment status progression.
  - `POST /api/clinical/appointments/<id>/consultation/`: Finalize diagnosis and prescriptions.
- **Pharmacist Services**:
  - `GET /api/pharmacy/queue/`: Prescriptions awaiting dispensing.
  - `POST /api/pharmacy/dispense/<id>/`: Atomically deduct batch inventory and mark prescriptions dispensed.
  - `GET /api/pharmacy/medicines/`: Medicine catalogue search and inventory.
- **Public Appointment Booking**:
  - `GET /api/accounts/doctors/`: Active doctors and specializations.
  - `POST /api/clinical/appointments/public/`: Walk-in / kiosk / web appointment registration issuing sequential token numbers and OPD slips.