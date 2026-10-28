"""
clinical/models.py

Core clinical workflow models:
  DoctorAvailability  — weekly recurring schedule slots
  Appointment         — booked + walk-in slots with FCFS token assignment
  MedicalRecord       — consultation notes, vitals, diagnosis
  Prescription        — dispensing header (linked to Appointment 1:1)
  PrescriptionMedicine — per-medicine line items with dispensed tracking
"""
from django.db import models

from accounts.models import DoctorProfile, PharmacistProfile, StudentProfile


class AppointmentStatus(models.TextChoices):
    BOOKED = "BOOKED", "Booked"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    NO_SHOW = "NO_SHOW", "No Show"


class PrescriptionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    DISPENSED = "DISPENSED", "Dispensed"
    PARTIAL = "PARTIAL", "Partially Dispensed"


class PaymentStatus(models.TextChoices):
    CREDIT_STUDENT = "CREDIT_STUDENT", "Credit (Institute Account)"
    PAID_CASH = "PAID_CASH", "Paid (Cash)"
    PENDING_CASH = "PENDING_CASH", "Pending Cash Payment"


# ── Doctor Availability ────────────────────────────────────────────────────

class DoctorAvailability(models.Model):
    """
    Recurring weekly availability of a doctor.
    day_of_week: 0=Monday … 6=Sunday (Python convention).
    """
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="availabilities"
    )
    day_of_week = models.IntegerField(
        choices=[(i, day) for i, day in enumerate(
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        )]
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_minutes = models.PositiveIntegerField(default=15)

    class Meta:
        db_table = "doctor_availability"
        verbose_name = "Doctor Availability"
        verbose_name_plural = "Doctor Availabilities"
        unique_together = [("doctor", "day_of_week", "start_time")]

    def __str__(self):
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        return f"{self.doctor.name} — {days[self.day_of_week]} {self.start_time}-{self.end_time}"


# ── Appointment ────────────────────────────────────────────────────────────

class Appointment(models.Model):
    """
    Single patient visit slot. Token is assigned atomically on creation.
    Emergencies (is_emergency=True) are served before regular tokens.
    Decision #7: unified FCFS queue — no separate walk-in vs online lanes.
    Decision #8: is_emergency pins this entry to queue top.
    """
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="appointments"
    )
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="appointments"
    )
    appointment_date = models.DateField(db_index=True)
    appointment_time = models.TimeField()
    token_number = models.PositiveIntegerField(null=True, blank=True, db_index=True)
    opd_number = models.CharField(max_length=100, blank=True, default="", db_index=True)
    status = models.CharField(
        max_length=20,
        choices=AppointmentStatus.choices,
        default=AppointmentStatus.BOOKED,
    )
    is_emergency = models.BooleanField(default=False)
    reminder_sent = models.BooleanField(default=False)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "appointment"
        verbose_name = "Appointment"
        verbose_name_plural = "Appointments"
        ordering = ["-appointment_date", "is_emergency", "token_number", "opd_number"]

    def __str__(self):
        return (
            f"#{self.token_number}:{self.opd_number} {self.student.name} → {self.doctor.name} "
            f"on {self.appointment_date} [{self.status}]"
        )


# ── Medical Record ─────────────────────────────────────────────────────────

class MedicalRecord(models.Model):
    """
    Doctor's consultation notes, linked 1:1 with an Appointment.
    diagnostic_reports is a JSONField list of { name, type, date, summary }.
    """
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="medical_record"
    )
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="medical_records"
    )
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="medical_records"
    )
    # Clinical data
    complaints = models.JSONField(
        default=list,
        help_text="List of {complaint, duration} objects",
    )
    examination = models.JSONField(
        default=dict,
        help_text="Vitals: {temperature, bp, pulse, spo2, oe, remarks}",
    )
    symptoms = models.TextField(blank=True)
    diagnosis = models.TextField()
    doctor_notes = models.TextField(blank=True)
    diagnostic_reports = models.JSONField(
        default=list,
        blank=True,
        help_text="List of {id, name, type, date, summary}",
    )
    selected_tests = models.JSONField(
        default=list,
        blank=True,
        help_text="List of ordered lab test names",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medical_record"
        verbose_name = "Medical Record"
        verbose_name_plural = "Medical Records"

    def __str__(self):
        return f"Record for {self.student.name} on {self.appointment.appointment_date}"


# ── Prescription ───────────────────────────────────────────────────────────

class Prescription(models.Model):
    """
    Dispensing header. One prescription per appointment.
    Decision #13: pharmacists may only update dispensed_quantity / payment_status.
    Decision #15: PENDING_CASH blocks dispensation until cash confirmed.
    """
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="prescription"
    )
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="prescriptions"
    )
    doctor = models.ForeignKey(
        DoctorProfile, on_delete=models.CASCADE, related_name="prescriptions"
    )
    instructions = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=PrescriptionStatus.choices,
        default=PrescriptionStatus.PENDING,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.CREDIT_STUDENT,
    )
    dispensed_by = models.ForeignKey(
        PharmacistProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dispensed_prescriptions",
    )
    prescribed_at = models.DateTimeField(auto_now_add=True)
    dispensed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "prescription"
        verbose_name = "Prescription"
        verbose_name_plural = "Prescriptions"
        ordering = ["-prescribed_at"]

    def __str__(self):
        return f"Rx #{self.id} for {self.student.name} [{self.status}]"


# ── Prescription Medicine line items ───────────────────────────────────────

class PrescriptionMedicine(models.Model):
    """
    One row per medicine on a prescription.
    prescribed_quantity is set by doctor — pharmacist cannot change it.
    dispensed_quantity is updated by pharmacist during dispensation.
    """
    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE, related_name="medicines"
    )
    # Forward reference to pharmacy.Medicine — resolved via string to avoid circular import
    medicine = models.ForeignKey(
        "pharmacy.Medicine", on_delete=models.CASCADE, related_name="prescription_lines"
    )
    dosage_frequency = models.CharField(
        max_length=100,
        help_text="e.g. '1-0-1', 'Once daily after food'",
    )
    duration_days = models.PositiveIntegerField(default=3)
    prescribed_quantity = models.PositiveIntegerField(default=1)
    dispensed_quantity = models.PositiveIntegerField(default=0)
    pharmacist_notes = models.CharField(
        max_length=255,
        blank=True,
        help_text="Rationale for generic substitution or partial dispensing",
    )

    class Meta:
        db_table = "prescription_medicine"
        verbose_name = "Prescription Medicine"
        verbose_name_plural = "Prescription Medicines"

    def __str__(self):
        return (
            f"{self.medicine.name} × {self.prescribed_quantity} "
            f"(dispensed: {self.dispensed_quantity})"
        )


# ── Patient Uploaded Reports & QR Sessions ──────────────────────────────────

class PatientReport(models.Model):
    """
    Medical documents/reports (PDF, Images) uploaded by or for a patient,
    associated with an appointment.
    """
    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, related_name="reports", null=True, blank=True
    )
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="patient_reports", null=True, blank=True
    )
    report_name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=100, default="Lab Report")
    file = models.FileField(upload_to="patient_reports/%Y/%m/")
    file_size = models.PositiveIntegerField(default=0, help_text="Size in bytes")
    mime_type = models.CharField(max_length=100, default="application/pdf")
    summary = models.TextField(blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "patient_report"
        verbose_name = "Patient Report"
        verbose_name_plural = "Patient Reports"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.report_name} ({self.student.name}) - {self.uploaded_at.strftime('%Y-%m-%d')}"


class QRUploadSession(models.Model):
    """
    Short-lived token session generated by the doctor or patient for report upload.
    Single-use bearer token expiring after TTL (default 15 minutes).
    """
    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, related_name="qr_upload_sessions", null=True, blank=True
    )
    token_hash = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "qr_upload_session"
        verbose_name = "QR Upload Session"
        verbose_name_plural = "QR Upload Sessions"
        ordering = ["-created_at"]

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()
