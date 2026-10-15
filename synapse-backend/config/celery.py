"""
Celery application for the SYNapse backend.
Handles:
  - Automated token triggering at appointment time (beat task)
  - Async email/SMS dispatch
"""
import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("synapse")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
