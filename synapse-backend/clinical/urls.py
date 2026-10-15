"""
clinical/urls.py

URLs for clinical app:
  - Doctor schedules & availability
  - Patient appointments (authenticated & kiosk/public)
  - Doctor live queue & status updates
  - Consultation submission
  - Patient historical visits
"""
from django.urls import path

from .views import (
    AppointmentBookView,
    AppointmentStatusUpdateView,
    DoctorAvailabilityView,
    DoctorQueueView,
    PatientVisitHistoryView,
    PublicAppointmentBookView,
    StudentAppointmentListView,
    SubmitConsultationView,
)

urlpatterns = [
    # Doctor Availability
    path("availability/", DoctorAvailabilityView.as_view(), name="clinical-availability"),

    # Appointments
    path("appointments/", AppointmentBookView.as_view(), name="clinical-appointment-book"),
    path("appointments/my/", StudentAppointmentListView.as_view(), name="clinical-appointment-my-list"),
    path("appointments/public/", PublicAppointmentBookView.as_view(), name="clinical-appointment-public"),
    path("appointments/<int:pk>/status/", AppointmentStatusUpdateView.as_view(), name="clinical-appointment-status"),
    path("appointments/<int:appointment_id>/consultation/", SubmitConsultationView.as_view(), name="clinical-consultation"),

    # Doctor queue
    path("queue/", DoctorQueueView.as_view(), name="clinical-doctor-queue"),

    # Patient visit history
    path("history/", PatientVisitHistoryView.as_view(), name="clinical-patient-history"),
]
