"""
clinical/serializers.py

Serializers for:
  - Appointment booking (student + public)
  - Doctor dashboard queue
  - Medical record creation/update
  - Patient visit history
"""
from rest_framework import serializers

from accounts.serializers import DoctorListSerializer, StudentProfileSerializer
from .models import (
    Appointment,
    AppointmentStatus,
    DoctorAvailability,
    MedicalRecord,
    Prescription,
    PrescriptionMedicine,
)


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    day_name = serializers.SerializerMethodField()

    class Meta:
        model = DoctorAvailability
        fields = ["id", "day_of_week", "day_name", "start_time", "end_time", "slot_minutes"]

    def get_day_name(self, obj):
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        return days[obj.day_of_week]


# ── Appointment ────────────────────────────────────────────────────────────

class AppointmentBookSerializer(serializers.ModelSerializer):
    """Used by student to create a new appointment."""

    class Meta:
        model = Appointment
        fields = [
            "id", "doctor", "appointment_date", "appointment_time",
            "reason", "is_emergency",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        from django.db import transaction
        student = self.context["request"].user.student_profile

        with transaction.atomic():
            # Assign the next sequential token for this doctor+date (FCFS)
            from django.db.models import Max
            existing_max = Appointment.objects.filter(
                doctor=validated_data["doctor"],
                appointment_date=validated_data["appointment_date"],
            ).aggregate(max_token=Max("token_number"))["max_token"] or 0

            validated_data["token_number"] = existing_max + 1
            validated_data["student"] = student
            appointment = super().create(validated_data)

        return appointment


class AppointmentListSerializer(serializers.ModelSerializer):
    """Doctor's view of today's queue."""
    patient_name = serializers.CharField(source="student.name")
    roll_no = serializers.CharField(source="student.roll_no")
    patient_category = serializers.SerializerMethodField()
    has_prescription = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id", "token_number", "patient_name", "roll_no",
            "patient_category", "appointment_date", "appointment_time",
            "status", "is_emergency", "reason", "has_prescription",
        ]

    def get_patient_category(self, obj):
        program = obj.student.program or ""
        if "PhD" in program or "M.Tech" in program or "M.S." in program:
            return "Research Scholar"
        elif program:
            return "Student"
        return "Staff"

    def get_has_prescription(self, obj):
        return hasattr(obj, "prescription")


class AppointmentStatusUpdateSerializer(serializers.ModelSerializer):
    """Doctor updates appointment status (Waiting → Consulting → Completed / No Show)."""
    class Meta:
        model = Appointment
        fields = ["status"]

    def validate_status(self, value):
        allowed = [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
            AppointmentStatus.BOOKED,
        ]
        if value not in allowed:
            raise serializers.ValidationError(f"Invalid status transition: {value}")
        return value


# ── Medical Record / Consultation ─────────────────────────────────────────

class PrescriptionMedicineWriteSerializer(serializers.Serializer):
    medicine_id = serializers.IntegerField()
    dosage_frequency = serializers.CharField(max_length=100)
    duration_days = serializers.IntegerField(min_value=1, default=3)
    prescribed_quantity = serializers.IntegerField(min_value=1)


class ConsultationWriteSerializer(serializers.Serializer):
    """
    Doctor submits the full consultation form:
    Creates/updates MedicalRecord and creates Prescription with medicines.
    """
    # Medical record fields
    complaints = serializers.ListField(child=serializers.DictField(), default=list)
    examination = serializers.DictField(default=dict)
    symptoms = serializers.CharField(required=False, allow_blank=True, default="")
    diagnosis = serializers.CharField()
    doctor_notes = serializers.CharField(required=False, allow_blank=True, default="")
    diagnostic_reports = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )
    selected_tests = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    # Prescription fields
    instructions = serializers.CharField(required=False, allow_blank=True, default="")
    payment_status = serializers.ChoiceField(
        choices=["CREDIT_STUDENT", "PAID_CASH", "PENDING_CASH"],
        default="CREDIT_STUDENT",
    )
    medicines = PrescriptionMedicineWriteSerializer(many=True, required=False, default=list)
    deliver_to_pharmacy = serializers.BooleanField(default=True)


class MedicalRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecord
        fields = [
            "id", "appointment", "student", "doctor",
            "complaints", "examination", "symptoms",
            "diagnosis", "doctor_notes", "diagnostic_reports",
            "selected_tests", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "appointment", "student", "doctor", "created_at", "updated_at"]


# ── Patient History ────────────────────────────────────────────────────────

class VisitMedicineSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="medicine.name")
    strength = serializers.CharField(source="medicine.strength")

    class Meta:
        model = PrescriptionMedicine
        fields = ["name", "strength", "dosage_frequency", "duration_days", "prescribed_quantity"]


class PatientVisitSerializer(serializers.ModelSerializer):
    """One visit record as returned to the patient."""
    doctor_name = serializers.CharField(source="doctor.name")
    date = serializers.DateField(source="appointment_date")
    medicines = serializers.SerializerMethodField()
    diagnosis = serializers.SerializerMethodField()
    complaint = serializers.SerializerMethodField()
    prescription_status = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id", "date", "doctor_name",
            "complaint", "diagnosis",
            "medicines", "prescription_status",
        ]

    def get_medicines(self, obj):
        if hasattr(obj, "prescription"):
            return VisitMedicineSerializer(obj.prescription.medicines.all(), many=True).data
        return []

    def get_diagnosis(self, obj):
        if hasattr(obj, "medical_record"):
            return obj.medical_record.diagnosis
        return ""

    def get_prescription_status(self, obj):
        if hasattr(obj, "prescription"):
            return obj.prescription.status
        return ""

    def get_complaint(self, obj):
        if hasattr(obj, "medical_record") and obj.medical_record.complaints:
            return ", ".join(
                c.get("complaint", "") for c in obj.medical_record.complaints
            )
        return obj.reason or ""


# ── Public / Kiosk Appointment Booking ─────────────────────────────────────

class PublicAppointmentBookSerializer(serializers.Serializer):
    """
    Kiosk / Walk-in / Public booking without prior login.
    Creates or looks up the StudentProfile (or guest record),
    and assigns an immediate sequential token.
    """
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    age = serializers.IntegerField(required=False, min_value=1, max_value=120)
    gender = serializers.CharField(max_length=20, required=False, allow_blank=True)
    entry_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    father_or_husband_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    complaints = serializers.CharField()
    past_illness = serializers.CharField(required=False, allow_blank=True, default="")
    allergies = serializers.CharField(required=False, allow_blank=True, default="")
    doctor_id = serializers.IntegerField()
    appointment_date = serializers.DateField()
    appointment_time = serializers.TimeField()
    is_emergency = serializers.BooleanField(default=False)

