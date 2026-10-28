"""
clinical/views.py

Doctor-facing and patient-facing clinical endpoints.
"""
import base64
import hashlib
import io
import secrets
from datetime import timedelta
import qrcode
from django.conf import settings
from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import DoctorProfile, StudentProfile, User, UserRole
from accounts.permissions import IsDoctor, IsStudent
from pharmacy.models import Medicine
from .models import (
    Appointment,
    DoctorAvailability,
    MedicalRecord,
    PatientReport,
    Prescription,
    PrescriptionMedicine,
    QRUploadSession,
)
from .serializers import (
    AppointmentBookSerializer,
    AppointmentListSerializer,
    AppointmentStatusUpdateSerializer,
    ConsultationWriteSerializer,
    DoctorAvailabilitySerializer,
    MedicalRecordSerializer,
    PatientReportSerializer,
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
    Also handles non-authenticated public web bookings, including medical report file attachments
    and mobile QR code upload session links.
    """
    permission_classes = []
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]

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
            medical_record = MedicalRecord.objects.create(
                appointment=appointment,
                student=student_profile,
                doctor=doctor,
                complaints=[{"complaint": data["complaints"], "duration": ""}],
                symptoms=data["complaints"],
                diagnosis="",
                doctor_notes='Allergies: ' + str(data.get('allergies', 'None')) + ' | Past Illness: ' + str(data.get('past_illness', 'None')),
                diagnostic_reports=[],
            )

            uploaded_reports = []

            # 1. Process files directly uploaded in the form
            files_to_process = []
            if "report_file" in request.FILES:
                files_to_process.append(request.FILES["report_file"])
            for f in request.FILES.getlist("reports"):
                files_to_process.append(f)
            for f in request.FILES.getlist("files"):
                files_to_process.append(f)

            for f in files_to_process:
                content_type = getattr(f, "content_type", "application/pdf") or "application/pdf"
                r_name = data.get("report_name") or f.name
                r_type = data.get("report_type") or ("Lab Report" if "pdf" in content_type.lower() else "Radiology / X-Ray")
                summary = f"Patient uploaded {r_type} during consultation booking: {f.name}"
                pr = PatientReport.objects.create(
                    appointment=appointment,
                    student=student_profile,
                    report_name=r_name,
                    report_type=r_type,
                    file=f,
                    file_size=f.size,
                    mime_type=content_type,
                    summary=summary,
                )
                size_str = (
                    f"{pr.file_size / (1024 * 1024):.2f} MB"
                    if pr.file_size >= 1024 * 1024
                    else f"{pr.file_size / 1024:.1f} KB"
                )
                rep_dict = {
                    "id": f"rep-{pr.id}",
                    "db_id": pr.id,
                    "name": pr.report_name,
                    "type": pr.report_type,
                    "date": pr.uploaded_at.strftime("%d %b %Y, %I:%M %p"),
                    "size": size_str,
                    "file_url": pr.file.url if pr.file else "",
                    "summary": pr.summary,
                    "mime_type": pr.mime_type,
                }
                uploaded_reports.append(rep_dict)

            # 2. Process reports uploaded via mobile QR session if token provided
            session_token = (data.get("session_token") or "").strip()
            if session_token:
                token_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()
                qr_session = QRUploadSession.objects.filter(token_hash=token_hash).first()
                if qr_session:
                    qr_session.appointment = appointment
                    qr_session.save(update_fields=["appointment"])
                    # Link any reports attached to this session token
                    unlinked_reports = PatientReport.objects.filter(
                        summary__contains=f"token:{token_hash}"
                    )
                    for ur in unlinked_reports:
                        ur.appointment = appointment
                        ur.student = student_profile
                        ur.save(update_fields=["appointment", "student"])
                        size_str = (
                            f"{ur.file_size / (1024 * 1024):.2f} MB"
                            if ur.file_size >= 1024 * 1024
                            else f"{ur.file_size / 1024:.1f} KB"
                        )
                        uploaded_reports.append({
                            "id": f"rep-{ur.id}",
                            "db_id": ur.id,
                            "name": ur.report_name,
                            "type": ur.report_type,
                            "date": ur.uploaded_at.strftime("%d %b %Y, %I:%M %p"),
                            "size": size_str,
                            "file_url": ur.file.url if ur.file else "",
                            "summary": ur.summary,
                            "mime_type": ur.mime_type,
                        })

            if uploaded_reports:
                medical_record.diagnostic_reports = uploaded_reports
                medical_record.save(update_fields=["diagnostic_reports", "updated_at"])

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
                "appointment_date": str(appointment.appointment_date),
                "appointment_time": str(appointment.appointment_time),
                "is_emergency": appointment.is_emergency,
                "status": appointment.status,
                "reports": uploaded_reports,
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


# ── QR Upload & Patient Reports Views ───────────────────────────────────────

import base64
import hashlib
import io
import secrets
from datetime import timedelta
import qrcode
from django.conf import settings
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import PatientReport, QRUploadSession
from .serializers import PatientReportSerializer


class ConsultationQRSessionView(APIView):
    """
    POST /api/clinical/consultation/qr-session/
    Public endpoint for patients in the consultation booking form to generate
    a mobile upload QR code and session token before appointment is submitted.
    """
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        expires_at = timezone.now() + timedelta(minutes=15)

        session = QRUploadSession.objects.create(
            appointment=None,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        origin = request.headers.get("Origin") or request.headers.get("Referer")
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            frontend_base = f"{parsed.scheme}://{parsed.netloc}"

        upload_url = f"{frontend_base.rstrip('/')}/upload/{token}"

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(upload_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
        qr_code_data_url = f"data:image/png;base64,{qr_b64}"

        return Response({
            "success": True,
            "session_id": session.id,
            "token": token,
            "upload_url": upload_url,
            "qr_code_data_url": qr_code_data_url,
            "expires_at": session.expires_at.isoformat(),
            "ttl_minutes": 15,
        })


class GenerateQRUploadSessionView(APIView):
    """
    POST /api/clinical/appointments/<appointment_id>/qr-session/
    Doctor generates a short-lived token and QR code for patient to upload documents.
    """
    permission_classes = [IsDoctor]

    def post(self, request, appointment_id):
        appointment = get_object_or_404(Appointment, pk=appointment_id)

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        expires_at = timezone.now() + timedelta(minutes=15)

        session = QRUploadSession.objects.create(
            appointment=appointment,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        # Build frontend upload URL
        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        origin = request.headers.get("Origin") or request.headers.get("Referer")
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            frontend_base = f"{parsed.scheme}://{parsed.netloc}"

        upload_url = f"{frontend_base.rstrip('/')}/upload/{token}"

        # Generate QR code image as base64 data URI
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(upload_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
        qr_code_data_url = f"data:image/png;base64,{qr_b64}"

        return Response({
            "success": True,
            "session_id": session.id,
            "token": token,
            "upload_url": upload_url,
            "qr_code_data_url": qr_code_data_url,
            "expires_at": session.expires_at.isoformat(),
            "ttl_minutes": 15,
            "patient_name": appointment.student.name,
            "appointment_id": appointment.id,
        })


class QRUploadSessionView(APIView):
    """
    GET /api/clinical/upload-session/<token>/
    Public verification endpoint checked when a patient scans the QR code on mobile.
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request, token):
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        session = QRUploadSession.objects.filter(token_hash=token_hash).select_related(
            "appointment__student", "appointment__doctor"
        ).first()

        if not session:
            return Response(
                {"detail": "Upload session not found.", "code": "not_found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if session.is_used:
            uploaded_reports = PatientReport.objects.filter(
                summary__contains=f"token:{token_hash}"
            )
            rep_list = [
                {
                    "id": f"rep-{r.id}",
                    "name": r.report_name,
                    "type": r.report_type,
                    "file_url": r.file.url if r.file else "",
                }
                for r in uploaded_reports
            ]
            return Response({
                "status": "COMPLETED",
                "is_used": True,
                "reports": rep_list,
                "message": "Report uploaded successfully.",
            })

        if session.expires_at < timezone.now():
            return Response(
                {"detail": "This upload link has expired.", "code": "expired"},
                status=status.HTTP_410_GONE,
            )

        patient_name = (
            session.appointment.student.name
            if session.appointment and session.appointment.student
            else "Consultation Patient"
        )
        doctor_name = (
            session.appointment.doctor.name
            if session.appointment and session.appointment.doctor
            else "Consulting Physician"
        )
        opd_number = (
            session.appointment.opd_number
            if session.appointment
            else "Consultation Intake"
        )

        return Response({
            "status": "ACTIVE",
            "is_used": False,
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "opd_number": opd_number,
            "appointment_id": session.appointment_id if session.appointment else None,
            "expires_at": session.expires_at.isoformat(),
        })


class QRFileUploadView(APIView):
    """
    POST /api/clinical/upload-session/<token>/upload/
    Public upload endpoint where patient posts their report PDF/image.
    """
    permission_classes = []
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, token):
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        session = QRUploadSession.objects.filter(token_hash=token_hash).select_related(
            "appointment__student", "appointment__doctor"
        ).first()

        if not session:
            return Response(
                {"detail": "Upload session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if session.is_used:
            return Response(
                {"detail": "This upload link has already been used."},
                status=status.HTTP_410_GONE,
            )

        if session.expires_at < timezone.now():
            return Response(
                {"detail": "This upload link has expired."},
                status=status.HTTP_410_GONE,
            )

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"detail": "No file was selected for upload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Max 15 MB
        if file_obj.size > 15 * 1024 * 1024:
            return Response(
                {"detail": "File size exceeds the 15 MB limit."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check binary magic bytes
        pos = file_obj.tell()
        header = file_obj.read(10)
        file_obj.seek(pos)

        is_pdf = header.startswith(b"%PDF-")
        is_png = header.startswith(b"\x89PNG\r\n\x1a\n")
        is_jpeg = header.startswith(b"\xff\xd8")

        if not (is_pdf or is_png or is_jpeg):
            return Response(
                {"detail": "Invalid file format. Please upload a PDF document or PNG/JPEG image."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report_name = (request.data.get("report_name") or "").strip() or file_obj.name
        report_type = (request.data.get("report_type") or "").strip() or ("PDF Document" if is_pdf else "Medical Scan/Image")

        summary = (request.data.get("summary") or "").strip()
        if not summary:
            summary = f"Uploaded via QR code [token:{token_hash}] on {timezone.now().strftime('%d %b %Y, %I:%M %p')}."
        else:
            summary = f"{summary} [token:{token_hash}]"

        # Save PatientReport
        report = PatientReport.objects.create(
            appointment=session.appointment,
            student=session.appointment.student if session.appointment else None,
            report_name=report_name,
            report_type=report_type,
            file=file_obj,
            file_size=file_obj.size,
            mime_type=file_obj.content_type or ("application/pdf" if is_pdf else "image/jpeg"),
            summary=summary,
        )

        if session.appointment:
            # Sync with MedicalRecord.diagnostic_reports
            record, _ = MedicalRecord.objects.get_or_create(
                appointment=session.appointment,
                defaults={
                    "student": session.appointment.student,
                    "doctor": session.appointment.doctor,
                    "complaints": [{"complaint": session.appointment.reason or "Routine Checkup", "duration": ""}],
                    "diagnosis": "Consultation in progress",
                },
            )
            report_size_str = (
                f"{report.file_size / (1024 * 1024):.2f} MB"
                if report.file_size >= 1024 * 1024
                else f"{report.file_size / 1024:.1f} KB"
            )
            report_entry = {
                "id": f"rep-{report.id}",
                "name": report.report_name,
                "type": report.report_type,
                "date": report.uploaded_at.strftime("%d %b %Y, %I:%M %p"),
                "size": report_size_str,
                "file_url": report.file.url,
                "summary": report.summary,
            }

            existing_reports = list(record.diagnostic_reports or [])
            existing_reports.insert(0, report_entry)
            record.diagnostic_reports = existing_reports
            record.save(update_fields=["diagnostic_reports", "updated_at"])

        # Mark session as used
        session.is_used = True
        session.used_at = timezone.now()
        session.save(update_fields=["is_used", "used_at"])

        return Response(
            {
                "success": True,
                "message": "Report uploaded successfully.",
                "report": {
                    "id": report.id,
                    "name": report.report_name,
                    "type": report.report_type,
                    "file_url": report.file.url,
                    "file_size": report.file_size,
                },
            },
            status=status.HTTP_201_CREATED,
        )


class AppointmentReportsView(APIView):
    """
    GET /api/clinical/appointments/<appointment_id>/reports/
    Returns all uploaded reports for this appointment.
    Supports numerical appointment ID, 'apt-<id>', or OPD number.
    """
    permission_classes = []
    authentication_classes = []

    def get(self, request, appointment_id):
        appointment = None
        apt_str = str(appointment_id).strip()
        if apt_str.isdigit():
            appointment = Appointment.objects.filter(pk=int(apt_str)).first()
        if not appointment and apt_str.startswith("apt-"):
            num = apt_str.replace("apt-", "")
            if num.isdigit():
                appointment = Appointment.objects.filter(pk=int(num)).first()
        if not appointment:
            appointment = Appointment.objects.filter(opd_number=apt_str).first()

        if not appointment:
            return Response([])

        reports = PatientReport.objects.filter(appointment=appointment).order_by("-uploaded_at")
        data = []
        seen_ids = set()

        for r in reports:
            size_str = (
                f"{r.file_size / (1024 * 1024):.2f} MB"
                if r.file_size >= 1024 * 1024
                else f"{r.file_size / 1024:.1f} KB"
            )
            file_url = r.file.url if r.file else ""
            data.append({
                "id": f"rep-{r.id}",
                "db_id": r.id,
                "name": r.report_name,
                "type": r.report_type,
                "date": r.uploaded_at.strftime("%d %b %Y, %I:%M %p"),
                "size": size_str,
                "file_url": file_url,
                "summary": r.summary,
                "mime_type": r.mime_type,
            })
            seen_ids.add(f"rep-{r.id}")

        if hasattr(appointment, "medical_record") and appointment.medical_record.diagnostic_reports:
            for item in appointment.medical_record.diagnostic_reports:
                if item.get("id") not in seen_ids:
                    data.append(item)
                    seen_ids.add(item.get("id"))

        return Response(data)


class DownloadPatientReportView(APIView):
    """
    GET /api/clinical/reports/<report_id>/download/
    Streams the uploaded report file as an attachment.
    """
    permission_classes = []

    def get(self, request, report_id):
        report = get_object_or_404(PatientReport, pk=report_id)
        if not report.file:
            return Response({"detail": "File not found on server."}, status=status.HTTP_404_NOT_FOUND)

        return FileResponse(
            report.file.open("rb"),
            as_attachment=True,
            filename=report.report_name,
        )
