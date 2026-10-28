"""
clinical/urls.py

URLs for clinical app:
  - Doctor schedules & availability
  - Patient appointments (authenticated & kiosk/public)
  - Doctor live queue & status updates
  - Consultation submission
  - Patient historical visits
  - QR-based patient report uploads & viewing
"""
from django.urls import path

from .views import (
    AppointmentBookView,
    AppointmentReportsView,
    AppointmentStatusUpdateView,
    DoctorAvailabilityView,
    DoctorQueueView,
    DownloadPatientReportView,
    ConsultationQRSessionView,
    GenerateQRUploadSessionView,
    PatientVisitHistoryView,
    PublicAppointmentBookView,
    QRFileUploadView,
    QRUploadSessionView,
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

    # QR Report Upload & Reports
    path("appointments/<int:appointment_id>/qr-session/", GenerateQRUploadSessionView.as_view(), name="clinical-appointment-qr-session"),
    path("appointments/<str:appointment_id>/reports/", AppointmentReportsView.as_view(), name="clinical-appointment-reports"),
    path("consultation/qr-session/", ConsultationQRSessionView.as_view(), name="clinical-consultation-qr-session"),
    path("upload-session/<str:token>/", QRUploadSessionView.as_view(), name="clinical-upload-session-info"),
    path("upload-session/<str:token>/upload/", QRFileUploadView.as_view(), name="clinical-upload-session-upload"),
    path("reports/<int:report_id>/download/", DownloadPatientReportView.as_view(), name="clinical-report-download"),
]
