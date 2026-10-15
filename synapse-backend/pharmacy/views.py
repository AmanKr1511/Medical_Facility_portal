"""
pharmacy/views.py

Pharmacist-facing endpoints:
  GET  /api/pharmacy/queue/                    — pending prescription queue
  POST /api/pharmacy/dispense/<prescription_id>/ — dispense and deduct inventory
  GET  /api/pharmacy/medicines/                — medicine catalogue (search)
  GET  /api/pharmacy/medicines/<id>/batches/   — stock batches for a medicine
"""
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsPharmacistOrAdmin
from clinical.models import Prescription, PrescriptionMedicine

from .models import Medicine, MedicineInventory
from .serializers import (
    DispenseRequestSerializer,
    InventoryBatchSerializer,
    MedicineSerializer,
    PharmacistQueueSerializer,
)


class PharmacistQueueView(generics.ListAPIView):
    """
    GET /api/pharmacy/queue/
    Returns all PENDING (and PARTIAL) prescriptions for today, ordered by token number.
    Emergencies appear first (is_emergency=True on the linked appointment).
    Matches Section 6 GET /api/pharmacist/queue/ contract.
    """
    serializer_class = PharmacistQueueSerializer
    permission_classes = [IsPharmacistOrAdmin]

    def get_queryset(self):
        today = timezone.now().date()
        return (
            Prescription.objects.filter(
                status__in=["PENDING", "PARTIAL"],
                appointment__appointment_date=today,
            )
            .select_related("appointment", "student", "doctor")
            .prefetch_related("medicines__medicine")
            .order_by(
                "-appointment__is_emergency",  # emergencies first
                "appointment__token_number",
            )
        )


class DispensePrescriptionView(APIView):
    """
    POST /api/pharmacy/dispense/<prescription_id>/
    Atomically:
      1. Validates stock availability for each item.
      2. Updates dispensed_quantity on each PrescriptionMedicine.
      3. Deducts from the specified MedicineInventory batch.
      4. Updates Prescription.status (DISPENSED / PARTIAL).
      5. Records dispensed_by and dispensed_at.
    Decision #13: prescribed_quantity is immutable by pharmacist.
    Decision #15: PENDING_CASH prescriptions cannot be dispensed.
    """
    permission_classes = [IsPharmacistOrAdmin]

    def post(self, request, prescription_id):
        try:
            prescription = (
                Prescription.objects.select_related(
                    "appointment", "student", "doctor"
                )
                .prefetch_related("medicines__medicine")
                .get(pk=prescription_id)
            )
        except Prescription.DoesNotExist:
            return Response(
                {"detail": f"Prescription #{prescription_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Decision #15 — block cash-pending prescriptions
        if prescription.payment_status == "PENDING_CASH":
            return Response(
                {
                    "detail": (
                        "Cannot dispense: payment is pending cash confirmation. "
                        "Mark as PAID_CASH in the EcoGreen POS first."
                    )
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        serializer = DispenseRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        items = data["items"]

        with transaction.atomic():
            # Map medicine_id → PrescriptionMedicine for quick lookup
            rx_med_map = {
                pm.medicine_id: pm for pm in prescription.medicines.all()
            }

            for item in items:
                med_id = item["medicine_id"]
                qty = item["dispensed_quantity"]
                batch: MedicineInventory = item["_batch"]

                # Validate against prescription
                rx_med = rx_med_map.get(med_id)
                if rx_med is None:
                    return Response(
                        {"detail": f"Medicine id {med_id} is not on this prescription."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Update dispensed quantity
                rx_med.dispensed_quantity = qty
                if data.get("notes"):
                    rx_med.pharmacist_notes = data["notes"]
                rx_med.save(update_fields=["dispensed_quantity", "pharmacist_notes"])

                # Deduct inventory (FEFO batch already specified by pharmacist)
                pharmacist_profile = getattr(request.user, "pharmacist_profile", None)
                batch.quantity -= qty
                batch.updated_by = pharmacist_profile
                batch.save(update_fields=["quantity", "updated_by", "updated_at"])

            # Determine overall prescription status
            all_lines = list(prescription.medicines.all())
            all_dispensed = all(
                pm.dispensed_quantity >= pm.prescribed_quantity for pm in all_lines
            )
            any_dispensed = any(pm.dispensed_quantity > 0 for pm in all_lines)

            if all_dispensed:
                prescription.status = "DISPENSED"
            elif any_dispensed:
                prescription.status = "PARTIAL"

            pharmacist_profile = getattr(request.user, "pharmacist_profile", None)
            prescription.payment_status = data["payment_status"]
            prescription.dispensed_by = pharmacist_profile
            prescription.dispensed_at = timezone.now()
            prescription.save(
                update_fields=[
                    "status", "payment_status",
                    "dispensed_by", "dispensed_at",
                ]
            )

        return Response(
            {
                "success": True,
                "message": f"Prescription #{prescription_id} dispensed and inventory deducted.",
            }
        )


class MedicineListView(generics.ListAPIView):
    """GET /api/pharmacy/medicines/?search=<name>"""
    serializer_class = MedicineSerializer
    permission_classes = [IsPharmacistOrAdmin]

    def get_queryset(self):
        qs = Medicine.objects.all()
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs


class MedicineBatchListView(generics.ListAPIView):
    """GET /api/pharmacy/medicines/<medicine_id>/batches/ — non-expired batches"""
    serializer_class = InventoryBatchSerializer
    permission_classes = [IsPharmacistOrAdmin]

    def get_queryset(self):
        medicine_id = self.kwargs["medicine_id"]
        today = timezone.now().date()
        return MedicineInventory.objects.filter(
            medicine_id=medicine_id,
            expiry_date__gte=today,
            quantity__gt=0,
        ).order_by("expiry_date")  # FEFO
