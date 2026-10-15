"""
clinical/tasks.py

Celery background tasks:
  1. send_upcoming_appointment_reminders: Every 5 minutes checks appointments in next 30 min (or next 3 tokens)
  2. send_appointment_confirmation_email: Async email confirmation on booking
  3. nightly_database_backup: 11:00 PM pg_dump with rotation, node rsync, and Google Drive upload
"""
import glob
import gzip
import logging
import os
import shutil
import subprocess
from datetime import datetime, timedelta

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


# ── Task 1: 5-Minute Appointment Reminders ─────────────────────────────────

@shared_task(name="clinical.tasks.send_upcoming_appointment_reminders")
def send_upcoming_appointment_reminders():
    """
    Scans today's waiting appointments. If an appointment is within the next
    30 minutes OR is among the next 3 tokens for that doctor today, sends
    an email notification and marks reminder_sent=True.
    """
    from .models import Appointment, AppointmentStatus

    now = timezone.localtime()
    today = now.date()
    current_time = now.time()
    future_time = (now + timedelta(minutes=30)).time()

    # Query today's unreminded booked appointments
    pending_appointments = (
        Appointment.objects.filter(
            appointment_date=today,
            status=AppointmentStatus.BOOKED,
            reminder_sent=False,
        )
        .select_related("student__user", "doctor")
        .order_by("token_number")
    )

    if not pending_appointments.exists():
        logger.info("No pending appointment reminders to send.")
        return 0

    # Group by doctor to determine the next 3 tokens per doctor
    reminders_sent = 0
    doctors = {apt.doctor for apt in pending_appointments}

    for doctor in doctors:
        # Get next 3 tokens for this doctor today
        next_3_ids = set(
            Appointment.objects.filter(
                doctor=doctor,
                appointment_date=today,
                status=AppointmentStatus.BOOKED,
            )
            .order_by("-is_emergency", "token_number")[:3]
            .values_list("id", flat=True)
        )

        doc_appointments = [apt for apt in pending_appointments if apt.doctor_id == doctor.id]

        for apt in doc_appointments:
            is_in_next_3 = apt.id in next_3_ids
            is_in_time_window = current_time <= apt.appointment_time <= future_time

            if is_in_next_3 or is_in_time_window:
                recipient = getattr(apt.student.user, "email", None)
                if not recipient:
                    continue

                subject = f"[SYNapse] Reminder: Upcoming Appointment Token #{apt.token_number}"
                message = (
                    f"Dear {apt.student.name},\n\n"
                    f"This is a reminder for your medical appointment today at the IIT Ropar Medical Center.\n\n"
                    f"  Token Number: #{apt.token_number}\n"
                    f"  Doctor: {apt.doctor.name} ({apt.doctor.specialization})\n"
                    f"  Cabin: {apt.doctor.cabin}\n"
                    f"  Date: {apt.appointment_date}\n"
                    f"  Scheduled Time: {apt.appointment_time.strftime('%I:%M %p')}\n\n"
                    f"Please proceed to {apt.doctor.cabin} when your token is called.\n\n"
                    f"— SYNapse Medical Center Team\n"
                    f"IIT Ropar"
                )

                try:
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "synapse-noreply@iitrpr.ac.in"),
                        recipient_list=[recipient],
                        fail_silently=False,
                    )
                    apt.reminder_sent = True
                    apt.save(update_fields=["reminder_sent"])
                    reminders_sent += 1
                    logger.info(f"Reminder sent for appointment #{apt.id} (Token #{apt.token_number}) to {recipient}")
                except Exception as e:
                    logger.error(f"Failed to send reminder for appointment #{apt.id}: {e}")

    return reminders_sent


# ── Task 2: Booking Confirmation Email ─────────────────────────────────────

@shared_task(name="clinical.tasks.send_appointment_confirmation_email")
def send_appointment_confirmation_email(appointment_id):
    """
    Sends an immediate booking confirmation email after appointment creation.
    """
    from .models import Appointment

    try:
        apt = (
            Appointment.objects.select_related("student__user", "doctor")
            .get(pk=appointment_id)
        )
    except Appointment.DoesNotExist:
        logger.error(f"Appointment #{appointment_id} not found for confirmation email.")
        return False

    recipient = getattr(apt.student.user, "email", None)
    if not recipient:
        return False

    subject = f"[SYNapse] Appointment Confirmed — Token #{apt.token_number}"
    message = (
        f"Dear {apt.student.name},\n\n"
        f"Your appointment at the IIT Ropar Medical Center has been successfully booked.\n\n"
        f"Appointment Details:\n"
        f"  Token Number: #{apt.token_number}\n"
        f"  Doctor: {apt.doctor.name} ({apt.doctor.specialization})\n"
        f"  Cabin: {apt.doctor.cabin}\n"
        f"  Date: {apt.appointment_date}\n"
        f"  Time: {apt.appointment_time.strftime('%I:%M %p')}\n"
        f"  Reason: {apt.reason or 'Consultation'}\n\n"
        f"You can monitor live queue status on the SYNapse portal.\n\n"
        f"— SYNapse Medical Center Team\n"
        f"IIT Ropar"
    )

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "synapse-noreply@iitrpr.ac.in"),
            recipient_list=[recipient],
            fail_silently=False,
        )
        logger.info(f"Confirmation email sent for appointment #{apt.id} to {recipient}")
        return True
    except Exception as e:
        logger.error(f"Failed to send confirmation email for appointment #{apt.id}: {e}")
        return False


# ── Task 3: 11:00 PM Nightly Database Backup (pg_dump) ─────────────────────

@shared_task(name="clinical.tasks.nightly_database_backup")
def nightly_database_backup():
    """
    Executes a compressed pg_dump to synapse-backend/backups/synapse_backup_<timestamp>.sql.gz.
    1. Keeps only the newest backup locally (deletes older local dumps).
    2. Syncs to clinic nodes via rsync if BACKUP_NODES is set in .env.
    3. Uploads to Google Drive and removes previous Drive dump if configured.
    """
    backup_dir = settings.BASE_DIR / "backups"
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = timezone.localtime().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"synapse_backup_{timestamp}.sql.gz"
    backup_filepath = backup_dir / backup_filename

    db_config = settings.DATABASES["default"]
    engine = db_config.get("ENGINE", "")

    logger.info(f"Initiating nightly database backup: {backup_filename}")

    # 1. Perform Backup
    if "postgresql" in engine:
        db_name = db_config.get("NAME", "synapse_db")
        db_user = db_config.get("USER", "synapse_user")
        db_pass = db_config.get("PASSWORD", "synapse_pass")
        db_host = db_config.get("HOST", "synapse-postgres")
        db_port = str(db_config.get("PORT", "5432"))

        env = os.environ.copy()
        if db_pass:
            env["PGPASSWORD"] = str(db_pass)

        dump_cmd = [
            "pg_dump",
            "-h", db_host,
            "-p", db_port,
            "-U", db_user,
            "-d", db_name,
            "--clean",
            "--no-owner",
        ]

        if not shutil.which("pg_dump"):
            raise FileNotFoundError(
                "pg_dump executable not found on PATH. "
                "In containerized mode, this is pre-installed via postgresql-client. "
                "On host, install via 'sudo apt install postgresql-client'."
            )

        try:
            dump_proc = subprocess.Popen(dump_cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            with gzip.open(backup_filepath, "wb") as gz_out:
                if dump_proc.stdout:
                    shutil.copyfileobj(dump_proc.stdout, gz_out)
            stderr = dump_proc.communicate()[1]

            if dump_proc.returncode != 0:
                err_msg = stderr.decode("utf-8", errors="replace")
                if os.path.exists(backup_filepath):
                    os.remove(backup_filepath)
                raise RuntimeError(f"pg_dump failed with exit code {dump_proc.returncode}: {err_msg}")

        except Exception as e:
            logger.error(f"PostgreSQL backup failed: {e}")
            raise
    else:
        # Fallback for SQLite development mode
        sqlite_file = db_config.get("NAME")
        if sqlite_file and os.path.exists(sqlite_file):
            with open(sqlite_file, "rb") as f_in:
                with gzip.open(backup_filepath, "wb") as f_out:
                    shutil.copyfileobj(f_in, f_out)
        else:
            raise FileNotFoundError(f"SQLite file not found at {sqlite_file}")

    file_size_mb = os.path.getsize(backup_filepath) / (1024 * 1024)
    logger.info(f"Database backup succeeded: {backup_filepath} ({file_size_mb:.2f} MB)")

    # 2. Delete older local backups (keep only the newest successful dump)
    existing_backups = sorted(
        glob.glob(str(backup_dir / "synapse_backup_*.sql.gz")),
        key=os.path.getmtime,
    )
    for old_path in existing_backups:
        if os.path.abspath(old_path) != os.path.abspath(backup_filepath):
            try:
                os.remove(old_path)
                logger.info(f"Removed previous local backup: {old_path}")
            except OSError as e:
                logger.warning(f"Could not delete old backup {old_path}: {e}")

    # 3. Sync to 3 Clinic Nodes via rsync if BACKUP_NODES is set
    backup_nodes = os.environ.get("BACKUP_NODES", "").strip()
    if backup_nodes:
        # e.g. "admin@kiosk:/backups,admin@docnode:/backups,admin@pharmnode:/backups"
        nodes = [n.strip() for n in backup_nodes.split(",") if n.strip()]
        for node in nodes:
            try:
                logger.info(f"Syncing backup to clinic node via rsync: {node}")
                rsync_cmd = [
                    "rsync",
                    "-avz",
                    "--delete",
                    f"{backup_filepath}",
                    f"{node}/",
                ]
                res = subprocess.run(rsync_cmd, capture_output=True, text=True, timeout=120)
                if res.returncode == 0:
                    logger.info(f"rsync to {node} completed successfully.")
                else:
                    logger.error(f"rsync to {node} failed: {res.stderr}")
            except Exception as e:
                logger.error(f"Error syncing to node {node}: {e}")
    else:
        logger.info("No BACKUP_NODES configured. Skipping rsync node sync.")

    # 4. Upload to Google Drive if GDRIVE_BACKUP_FOLDER_ID is set
    gdrive_folder_id = os.environ.get("GDRIVE_BACKUP_FOLDER_ID", "").strip()
    gdrive_sa_file = os.environ.get("GDRIVE_SERVICE_ACCOUNT_FILE", "").strip()

    if gdrive_folder_id and gdrive_sa_file and os.path.exists(gdrive_sa_file):
        try:
            logger.info("Uploading backup to Google Drive...")
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            from googleapiclient.http import MediaFileUpload

            creds = service_account.Credentials.from_service_account_file(
                gdrive_sa_file,
                scopes=["https://www.googleapis.com/auth/drive"],
            )
            drive_service = build("drive", "v3", credentials=creds)

            # Upload the new dump
            file_metadata = {
                "name": backup_filename,
                "parents": [gdrive_folder_id],
            }
            media = MediaFileUpload(str(backup_filepath), mimetype="application/gzip", resumable=True)
            uploaded_file = (
                drive_service.files()
                .create(body=file_metadata, media_body=media, fields="id, name")
                .execute()
            )
            new_file_id = uploaded_file.get("id")
            logger.info(f"Uploaded to Google Drive as file id: {new_file_id}")

            # Delete previous dumps in that folder
            query = f"'{gdrive_folder_id}' in parents and name contains 'synapse_backup_' and trashed = false"
            results = drive_service.files().list(q=query, fields="files(id, name)").execute()
            items = results.get("files", [])
            for item in items:
                if item["id"] != new_file_id:
                    drive_service.files().delete(fileId=item["id"]).execute()
                    logger.info(f"Deleted previous Google Drive backup: {item['name']} ({item['id']})")

        except ImportError:
            logger.warning("google-api-python-client not installed; skipping Google Drive backup upload.")
        except Exception as e:
            logger.error(f"Google Drive backup upload failed: {e}")
    else:
        logger.info("Google Drive backup skipped: GDRIVE_BACKUP_FOLDER_ID or service account file not configured.")

    return {
        "status": "success",
        "file": str(backup_filepath),
        "filename": backup_filename,
        "size_mb": round(file_size_mb, 2),
    }
