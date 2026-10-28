"""
pharmacy/serializers.py

Serializers for the pharmacist-facing queue and dispensation endpoints.
"""
from rest_framework import serializers

from clinical.models import Prescription, PrescriptionMedicine, Appointment
from clinical.serializers import VisitMedicineSerializer
from .models import Medicine, MedicineInventory


class MedicineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicine
        fields = ["id", "name", "generic_name", "form", "strength", "reorder_level", "total_stock", "is_low_stock"]


class InventoryBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicineInventory
        fields = ["id", "batch_number", "quantity", "expiry_date"]


# ── Pharmacist Queue ────────────────────────────────────────────────────────

class QueueMedicineSerializer(serializers.ModelSerializer):
    """Medicine line item as returned in the pharmacist queue."""
    id = serializers.IntegerField(source="pk")
    medicine_id = serializers.IntegerField(source="medicine.id", read_only=True)
    name = serializers.CharField(source="medicine.name")
    strength = serializers.CharField(source="medicine.strength")

    class Meta:
        model = PrescriptionMedicine
        fields = [
            "id", "medicine_id", "name", "strength",
            "dosage_frequency", "duration_days",
            "prescribed_quantity", "dispensed_quantity",
        ]


class PharmacistQueueSerializer(serializers.ModelSerializer):
    """
    Full prescription entry as served to GET /api/pharmacy/queue/.
    Shape matches Section 6 API contract exactly.
    """
    token_number = serializers.IntegerField(source="appointment.token_number")
    patient_name = serializers.CharField(source="student.name")
    roll_no = serializers.CharField(source="student.roll_no")
    doctor_name = serializers.CharField(source="doctor.name")
    prescribed_at = serializers.DateTimeField()
    medicines = QueueMedicineSerializer(many=True)

    class Meta:
        model = Prescription
        fields = [
            "id", "token_number", "patient_name", "roll_no",
            "doctor_name", "prescribed_at", "status", "payment_status",
            "medicines",
        ]


# ── Dispensation Input ─────────────────────────────────────────────────────

class DispenseItemSerializer(serializers.Serializer):
    medicine_id = serializers.IntegerField()
    batch_number = serializers.CharField(max_length=100)
    dispensed_quantity = serializers.IntegerField(min_value=0)

    def validate(self, data):
        try:
            batch = MedicineInventory.objects.get(
                medicine_id=data["medicine_id"],
                batch_number=data["batch_number"],
            )
        except MedicineInventory.DoesNotExist:
            raise serializers.ValidationError(
                f"Batch '{data['batch_number']}' not found for medicine id {data['medicine_id']}."
            )
        if batch.quantity < data["dispensed_quantity"]:
            raise serializers.ValidationError(
                f"Insufficient stock in batch '{data['batch_number']}'. "
                f"Available: {batch.quantity}, requested: {data['dispensed_quantity']}."
            )
        data["_batch"] = batch
        return data


class DispenseRequestSerializer(serializers.Serializer):
    items = DispenseItemSerializer(many=True)
    payment_status = serializers.ChoiceField(
        choices=["CREDIT_STUDENT", "PAID_CASH", "PENDING_CASH"],
    )
    notes = serializers.CharField(required=False, allow_blank=True, default="")

class OPDSerializer(serializers.ModelSerializer):
    """Serializer for OPD visits"""
    patient_name = serializers.CharField(source="student.name")
    doctor_name = serializers.CharField(source="doctor.name")
    date = serializers.DateField(source="appointment_date")
    opd_number = serializers.CharField(default="", allow_blank=True)
    medicines = serializers.SerializerMethodField()
    diagnosis = serializers.SerializerMethodField()
    complaint = serializers.SerializerMethodField()
    prescription_status = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id", "date", "patient_name", "doctor_name", "opd_number",
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