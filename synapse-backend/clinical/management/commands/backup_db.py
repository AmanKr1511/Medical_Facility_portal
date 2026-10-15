"""
clinical/management/commands/backup_db.py

Management command to trigger the nightly database backup manually.
Usage:
    python manage.py backup_db
"""
from django.core.management.base import BaseCommand
from clinical.tasks import nightly_database_backup


class Command(BaseCommand):
    help = "Runs a compressed pg_dump database backup, cleans older dumps, and syncs remote nodes/G-Drive."

    def handle(self, *args, **options):
        self.stdout.write("Starting manual database backup...")
        try:
            result = nightly_database_backup()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Backup completed successfully!\n"
                    f"File: {result.get('file')}\n"
                    f"Size: {result.get('size_mb')} MB"
                )
            )
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Backup failed: {e}"))
            raise e
