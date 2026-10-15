# SYNapse Medical Facility Portal

Digital Outpatient Department (OPD) platform for the **IIT Ropar Medical Center**, featuring role-based workflows for Patients, Doctors, Pharmacists, and Administrators, automated queue management, digital prescriptions, inventory dispensing, Celery background tasks, and automated database backups.

---

## 🚀 One-Command Docker Setup

The entire multi-container stack can be launched with a single command from the root directory:

```bash
docker compose up --build
```

This will automatically build, configure, migrate, seed demo fixtures, and start all 6 services:

| Container Name | Service | Internal Port | Host Port | Role |
| :--- | :--- | :--- | :--- | :--- |
| **`synapse-postgres`** | PostgreSQL 16 | `5432` | `5432` | Relational database (`synapse_db`) |
| **`synapse-redis`** | Redis 7 Alpine | `6379` | `6379` | Message broker & cache |
| **`synapse-django`** | Django 5.1 + DRF | `8000` | `8000` | Core REST API backend |
| **`synapse-celery-worker`** | Celery Worker | — | — | Executes appointment reminders & email confirmations |
| **`synapse-celery-beat`** | Celery Beat | — | — | Schedules 5-min reminders & 11:00 PM pg_dump backup |
| **`synapse-frontend`** | Nginx + React 19 SPA | `80` | `5173`, `8080` | Production UI with built-in `/api/` reverse proxy |

Open your browser to: **[http://localhost:5173](http://localhost:5173)** (or **[http://localhost:8080](http://localhost:8080)**).

To stop all services:
```bash
docker compose down
```

---

## 🔑 Demo Credentials & Quick Logins

The login screen provides one-click quick-fill buttons with password `demo@123`:

| Role | Quick ID / Roll No | Email | Password | User Details |
|---|---|---|---|---|
| **Patient** | `p-101` or `2026AIM1007` | `student@iitrpr.ac.in` | `demo@123` | Aarav Sharma (M.Tech AI) |
| **Doctor** | `doc-201` | `doctor@iitrpr.ac.in` | `demo@123` | Dr. Doom (OPD Room 102) |
| **Pharmacist** | `ph-301` | `pharmacist@iitrpr.ac.in` | `demo@123` | Rohan Verma (Pharmacy Counter) |
| **Admin** | `admin` | `admin@iitrpr.ac.in` | `admin@123` | Portal Administrator |

---

## ⚡ Automated Background Tasks & Backups

1. **5-Minute Appointment Reminders (`send_upcoming_appointment_reminders`)**:
   - Runs automatically every 5 minutes via Celery Beat.
   - Checks waiting appointments for today within the next 30 minutes OR in the next 3 doctor tokens.
   - Dispatches email alerts to patients and marks `reminder_sent = True`.
2. **Async Booking Confirmation Email (`send_appointment_confirmation_email`)**:
   - Sent immediately in the background whenever an appointment is created.
3. **11:00 PM Nightly Compressed pg_dump Backup (`nightly_database_backup`)**:
   - Scheduled at 23:00 (Asia/Kolkata timezone) daily.
   - Creates a compressed dump in `synapse-backend/backups/synapse_backup_<timestamp>.sql.gz`.
   - Rotates and purges older local `.sql.gz` dumps.
   - Supports syncing to clinic nodes via `rsync` if `BACKUP_NODES` is set in `.env`.
   - Supports Google Drive upload and deletion of older Drive dumps if `GDRIVE_BACKUP_FOLDER_ID` and `GDRIVE_SERVICE_ACCOUNT_FILE` are set.
   - **Manual test command:**
     ```bash
     docker compose exec synapse-django python manage.py backup_db
     ```