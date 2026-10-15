"""
clinical/admin.py

Django Admin registrations for Clinical workflows:
  - DoctorAvailability
  - Appointment
  - MedicalRecord
  - Prescription & PrescriptionMedicine inline
"""
from django.contrib import admin

from .models import (
    Appointment,
    DoctorAvailability,
    MedicalRecord,
    Prescription,
    PrescriptionMedicine,
)


class PrescriptionMedicineInline(admin.TabularInline):
    model = PrescriptionMedicine
    extra = 1
    fields = [
        "medicine", "dosage_frequency", "duration_days",
        "prescribed_quantity", "dispensed_quantity", "pharmacist_notes",
    ]


@admin.register(DoctorAvailability)
class DoctorAvailabilityAdmin(admin.ModelAdmin):
    list_display = ["doctor", "day_of_week", "start_time", "end_time", "slot_minutes"]
    list_filter = ["day_of_week", "doctor"]


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = [
        "token_number", "student", "doctor", "appointment_date",
        "appointment_time", "status", "is_emergency", "created_at",
    ]
    list_filter = ["status", "is_emergency", "appointment_date", "doctor"]
    search_fields = ["student__name", "student__roll_no", "doctor__name", "reason"]
    ordering = ["-appointment_date", "token_number"]


@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ["appointment", "student", "doctor", "diagnosis", "created_at"]
    search_fields = ["student__name", "student__roll_no", "doctor__name", "diagnosis"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = [
        "id", "appointment", "student", "doctor",
        "status", "payment_status", "dispensed_by", "prescribed_at", "dispensed_at",
    ]
    list_filter = ["status", "payment_status", "prescribed_at"]
    search_fields = ["student__name", "student__roll_no", "doctor__name"]
    inlines = [PrescriptionMedicineInline]
