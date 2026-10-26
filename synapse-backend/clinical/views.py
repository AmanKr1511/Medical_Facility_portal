"""
clinical/views.py

Doctor-facing and patient-facing clinical endpoints.
"""
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import DoctorProfile, StudentProfile, User, UserRole
from accounts.permissions import IsDoctor, IsStudent
from pharmacy.models import Medicine
from .models import (
    Appointment,
    DoctorAvailability,
    MedicalRecord,
    Prescription,
    PrescriptionMedicine,
)
from .serializers import (
    AppointmentBookSerializer,
    AppointmentListSerializer,
    AppointmentStatusUpdateSerializer,
    ConsultationWriteSerializer,
    DoctorAvailabilitySerializer,
    MedicalRecordSerializer,
    PatientVisitSerializer,
    PublicAppointmentBookSerializer,
)


# ── Doctor Availability (public) ───────────────────────────────────────────

class DoctorAvailabilityView(generics.ListAPIView):
    """GET /api/clinical/availability/?doctor_id=<id>"""
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = []
    authentication_classes = []

    def get_queryset(self):
        qs = DoctorAvailability.objects.select_related("doctor")
        doctor_id = self.request.query_params.get("doctor_id")
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        return qs


# ── Appointment Booking ───────────────────────────────────────────────────

class PublicAppointmentBookView(APIView):
    """
    POST /api/clinical/appointments/public/
    Kiosk Node self-service walk-in registration and token issuance.
    Also handles non-authenticated public web bookings.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        serializer = PublicAppointmentBookSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data["email"].strip().lower()

        with transaction.atomic():
            # Find or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={"role": UserRole.STUDENT},
            )

            roll_no = data.get("entry_number") or f"WALK-{timezone.now().strftime('%Y%m%d%H%M%S')}"

            student_profile, _ = StudentProfile.objects.get_or_create(
                user=user,
                defaults={
                    "name": data["name"],
                    "roll_no": roll_no,
                    "department": data.get("department", "General"),
                    "program": "Visitor / Walk-in",
                    "gender": data.get("gender", ""),
                    "allergies": data.get("allergies", ""),
                    "past_illness": data.get("past_illness", ""),
                },
            )

            try:
                doctor = DoctorProfile.objects.get(pk=data["doctor_id"])
            except DoctorProfile.DoesNotExist:
                return Response({"detail": "Selected doctor not found."}, status=status.HTTP_404_NOT_FOUND)

            # Assign sequential token
            from django.db.models import Max
            max_token = Appointment.objects.filter(
                doctor=doctor,
                appointment_date=data["appointment_date"],
            ).aggregate(max_token=Max("token_number"))["max_token"] or 0

            token_number = max_token + 1
            opd_number = f"OPD-{timezone.now().strftime('%m%d')}-{token_number:03d}"

            appointment = Appointment.objects.create(
                student=student_profile,
                doctor=doctor,
                appointment_date=data["appointment_date"],
                appointment_time=data["appointment_time"],
                token_number=token_number,
                opd_number=opd_number,
                is_emergency=data.get("is_emergency", False),
                reason=data["complaints"],
            )

            # Also create an initial medical record draft with complaints and allergies
            MedicalRecord.objects.create(
                appointment=appointment,
                student=student_profile,
                doctor=doctor,
                complaints=[{"complaint": data["complaints"], "duration": ""}],
                symptoms=data["complaints"],
                diagnosis="",
                doctor_notes=f"Allergies: {data.get('allergies', 'None')}\nPast Illness: {data.get('past_illness', 'None')}",
            )

            # Trigger async booking confirmation email
            try:
                from .tasks import send_appointment_confirmation_email
                send_appointment_confirmation_email.delay(appointment.id)
            except Exception:
                pass

        return Response(
            {
                "success": True,
                "opd_number": opd_number,
                "token_number": token_number,
                "appointment_id": appointment.id,
                "doctor_name": doctor.name,
                "patient_name": student_profile.name,
                "appointment_date": appointment.appointment_date,
                "appointment_time": str(appointment.appointment_time),
                "is_emergency": appointment.is_emergency,
                "status": appointment.status,
            },
            status=status.HTTP_201_CREATED,
        )


class AppointmentBookView(generics.CreateAPIView):
    """POST /api/clinical/appointments/ — authenticated student books a slot."""
    serializer_class = AppointmentBookSerializer
    permission_classes = [IsStudent]

    def perform_create(self, serializer):
        appointment = serializer.save()
        try:
            from .tasks import send_appointment_confirmation_email
            send_appointment_confirmation_email.delay(appointment.id)
        except Exception:
            pass



class StudentAppointmentListView(generics.ListAPIView):
    """GET /api/clinical/appointments/ — student's own upcoming appointments."""
    serializer_class = AppointmentListSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return (
            Appointment.objects.filter(
                student=self.request.user.student_profile,
                appointment_date__gte=timezone.now().date(),
                status=Appointment.status.field.choices[0][0],  # BOOKED
            )
            .select_related("doctor", "student")
            .order_by("appointment_date", "token_number")
        )


# ── Doctor Queue ───────────────────────────────────────────────────────────

class DoctorQueueView(generics.ListAPIView):
    """
    GET /api/clinical/queue/
    Today's queue for the authenticated doctor.
    Emergencies always float to the top.
    Decision #8: is_emergency ordering.
    """
    serializer_class = AppointmentListSerializer
    permission_classes = [IsDoctor]

    def get_queryset(self):
        today = timezone.now().date()
        return (
            Appointment.objects.filter(
                doctor=self.request.user.doctor_profile,
                appointment_date=today,
                status="BOOKED",
            )
            .select_related("student", "doctor")
            .prefetch_related("prescription")
            .order_by("-is_emergency", "token_number")
        )


class AppointmentStatusUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/clinical/appointments/<id>/status/
    Doctor updates status: Completed, Cancelled, No Show.
    Decision #10: NO_SHOW moves to bottom of queue.
    """
    serializer_class = AppointmentStatusUpdateSerializer
    permission_classes = [IsDoctor]
    http_method_names = ["patch"]

    def get_queryset(self):
        return Appointment.objects.filter(doctor=self.request.user.doctor_profile)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]

        with transaction.atomic():
            if new_status == "NO_SHOW":
                # Decision #10: push to end of today's queue
                from django.db.models import Max
                max_token = Appointment.objects.filter(
                    doctor=instance.doctor,
                    appointment_date=instance.appointment_date,
                ).aggregate(max_token=Max("token_number"))["max_token"] or 0
                instance.token_number = max_token + 1

            instance.status = new_status
            instance.save(update_fields=["status", "token_number"])

        return Response(AppointmentListSerializer(instance).data)


# ── Consultation (Doctor submits clinical form) ────────────────────────────

class SubmitConsultationView(APIView):
    """
    POST /api/clinical/appointments/<appointment_id>/consultation/
    Doctor finalizes: creates/updates MedicalRecord + Prescription + PrescriptionMedicines.
    """
    permission_classes = [IsDoctor]

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.select_related(
                "student", "doctor"
            ).get(pk=appointment_id, doctor=request.user.doctor_profile)
        except Appointment.DoesNotExist:
            return Response({"detail": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ConsultationWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        with transaction.atomic():
            # Create or update MedicalRecord
            record_defaults = {
                "student": appointment.student,
                "doctor": appointment.doctor,
                "complaints": data["complaints"],
                "examination": data["examination"],
                "symptoms": data["symptoms"],
                "diagnosis": data["diagnosis"],
                "doctor_notes": data["doctor_notes"],
                "diagnostic_reports": data["diagnostic_reports"],
                "selected_tests": data["selected_tests"],
            }
            record, _ = MedicalRecord.objects.update_or_create(
                appointment=appointment,
                defaults=record_defaults,
            )

            # Create Prescription if medicines provided
            if data["medicines"]:
                prescription, created = Prescription.objects.get_or_create(
                    appointment=appointment,
                    defaults={
                        "student": appointment.student,
                        "doctor": appointment.doctor,
                        "instructions": data["instructions"],
                        "payment_status": data["payment_status"],
                    },
                )
                if not created:
                    prescription.instructions = data["instructions"]
                    prescription.payment_status = data["payment_status"]
                    prescription.save(update_fields=["instructions", "payment_status"])
                    prescription.medicines.all().delete()

                for med_data in data["medicines"]:
                    medicine = Medicine.objects.get(pk=med_data["medicine_id"])
                    PrescriptionMedicine.objects.create(
                        prescription=prescription,
                        medicine=medicine,
                        dosage_frequency=med_data["dosage_frequency"],
                        duration_days=med_data["duration_days"],
                        prescribed_quantity=med_data["prescribed_quantity"],
                    )

            # Mark appointment completed
            appointment.status = "COMPLETED"
            appointment.save(update_fields=["status"])

        return Response(
            {"success": True, "message": "Consultation finalized.", "record_id": record.id},
            status=status.HTTP_201_CREATED,
        )


# ── Patient History ────────────────────────────────────────────────────────

class PatientVisitHistoryView(generics.ListAPIView):
    """
    GET /api/clinical/history/
    Returns the authenticated patient's visit history, newest first.
    Matches Section 6 GET /api/patient/history/ contract.
    Supports filters: ?date=YYYY-MM-DD&doctor=<name>&medicine=<name>
    """
    serializer_class = PatientVisitSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        student = self.request.user.student_profile
        print(student)
        qs = (
            Appointment.objects.filter(
                student=student,
                status="COMPLETED",
            )
            .select_related("student", "doctor", "medical_record")
            .prefetch_related(
                "prescription__medicines__medicine",
            )
            .order_by("-appointment_date")
        )

        date = self.request.query_params.get("date")
        doctor = self.request.query_params.get("doctor")
        medicine = self.request.query_params.get("medicine")

        if date:
            qs = qs.filter(appointment_date=date)
        if doctor:
            qs = qs.filter(doctor__name__icontains=doctor)
        if medicine:
            qs = qs.filter(
                prescription__medicines__medicine__name__icontains=medicine
            ).distinct()

        return qs
