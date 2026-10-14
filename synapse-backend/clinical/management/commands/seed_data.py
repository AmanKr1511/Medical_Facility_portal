"""
Django management command: seed_data
Populates the database with initial clinic demo fixtures.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date, time

from accounts.models import User, UserRole, StudentProfile, DoctorProfile, PharmacistProfile
from pharmacy.models import Medicine, MedicineForm, MedicineInventory
from clinical.models import (
    DoctorAvailability,
    Appointment,
    AppointmentStatus,
    MedicalRecord,
    Prescription,
    PrescriptionStatus,
    PaymentStatus,
    PrescriptionMedicine,
)


class Command(BaseCommand):
    help = "Seeds initial database with test users, doctors, medicines, batches, appointments, and prescriptions."

    def handle(self, *args, **options):
        self.stdout.write("Starting SYNapse database seeding...")

        # 1. Users & Profiles
        self.stdout.write("Creating Users & Profiles...")

        # Admin
        admin_user, _ = User.objects.get_or_create(
            email="admin@iitrpr.ac.in",
            defaults={"role": UserRole.ADMIN, "is_staff": True, "is_superuser": True},
        )
        admin_user.set_password("admin@123")
        admin_user.save()

        # Doctor 1 (Dr. Doom / doc-201)
        doc1_user, _ = User.objects.get_or_create(
            email="doctor@iitrpr.ac.in",
            defaults={"role": UserRole.DOCTOR, "is_staff": False},
        )
        doc1_user.set_password("demo@123")
        doc1_user.save()

        doc1_profile, _ = DoctorProfile.objects.update_or_create(
            user=doc1_user,
            defaults={
                "name": "Dr. Doom",
                "phone": "+91 9876500001",
                "specialization": "General Physician & Internal Medicine",
                "qualification": "MBBS, MD (Medicine)",
                "cabin": "OPD Room 102",
            },
        )

        # Doctor 2 (Dr. Kabir Singh)
        doc2_user, _ = User.objects.get_or_create(
            email="dr.kabir@iitrpr.ac.in",
            defaults={"role": UserRole.DOCTOR, "is_staff": False},
        )
        doc2_user.set_password("demo@123")
        doc2_user.save()

        doc2_profile, _ = DoctorProfile.objects.update_or_create(
            user=doc2_user,
            defaults={
                "name": "Dr. Kabir Singh",
                "phone": "+91 9876500002",
                "specialization": "Orthopedics & Sports Medicine",
                "qualification": "MBBS, MS (Ortho)",
                "cabin": "OPD Room 105",
            },
        )

        # Pharmacist (Rohan Verma / ph-301)
        pharma_user, _ = User.objects.get_or_create(
            email="pharmacist@iitrpr.ac.in",
            defaults={"role": UserRole.PHARMACIST, "is_staff": True},
        )
        pharma_user.set_password("demo@123")
        pharma_user.save()

        pharma_profile, _ = PharmacistProfile.objects.update_or_create(
            user=pharma_user,
            defaults={
                "name": "Rohan Verma",
                "phone": "+91 9876500003",
            },
        )

        # Student 1: Aarav Sharma (p-101 / 2026AIM1007)
        student1_user, _ = User.objects.get_or_create(
            email="student@iitrpr.ac.in",
            defaults={"role": UserRole.STUDENT},
        )
        student1_user.set_password("demo@123")
        student1_user.save()

        student1_profile, _ = StudentProfile.objects.update_or_create(
            user=student1_user,
            defaults={
                "name": "Aarav Sharma",
                "roll_no": "2026AIM1007",
                "department": "Artificial Intelligence",
                "program": "M.Tech AI",
                "year": 1,
                "hostel": "Raag Hostel, Room B-214",
                "phone": "+91 9876511111",
                "date_of_birth": date(2002, 5, 14),
                "gender": "Male",
                "blood_group": "O+",
                "allergies": "Penicillin, Sulfa drugs",
                "current_medicines": "None",
                "past_illness": "Mild Childhood Asthma",
                "emergency_contact_name": "Rajesh Sharma",
                "emergency_contact_phone": "+91 9876599999",
            },
        )

        # Additional Students matching frontend mock
        students_data = [
            ("Ananya Gupta", "ananya.gupta@iitrpr.ac.in", "2025CSB1042", "Computer Science", "B.Tech CSE", 2, "Chenab Hostel"),
            ("Vikram Patel", "vikram.patel@iitrpr.ac.in", "2024MEB1102", "Mechanical Engg", "B.Tech ME", 3, "Beas Hostel"),
            ("Sneha Reddy", "sneha.reddy@iitrpr.ac.in", "2023EEB1089", "Electrical Engg", "B.Tech EE", 4, "Sutlej Hostel"),
            ("Rahul Nair", "rahul.nair@iitrpr.ac.in", "2024PHD1011", "Physics", "PhD Physics", 2, "Brahmaputra Hostel"),
            ("Priya Menon", "priya.menon@iitrpr.ac.in", "2025MSB1005", "Biomedical Engg", "M.S. Research", 1, "Chenab Hostel"),
        ]

        student_profiles = {"student@iitrpr.ac.in": student1_profile}
        for name, email, roll, dept, prog, yr, hstl in students_data:
            s_user, _ = User.objects.get_or_create(email=email, defaults={"role": UserRole.STUDENT})
            s_user.set_password("demo@123")
            s_user.save()
            s_prof, _ = StudentProfile.objects.update_or_create(
                user=s_user,
                defaults={
                    "name": name,
                    "roll_no": roll,
                    "department": dept,
                    "program": prog,
                    "year": yr,
                    "hostel": hstl,
                    "phone": "+91 9876522222",
                    "blood_group": "B+",
                },
            )
            student_profiles[email] = s_prof

        # 2. Doctor Availabilities
        self.stdout.write("Configuring Doctor Availability...")
        for day in range(5):  # Mon-Fri
            DoctorAvailability.objects.get_or_create(
                doctor=doc1_profile,
                day_of_week=day,
                start_time=time(9, 0),
                defaults={"end_time": time(13, 0), "slot_minutes": 15},
            )
            DoctorAvailability.objects.get_or_create(
                doctor=doc1_profile,
                day_of_week=day,
                start_time=time(14, 0),
                defaults={"end_time": time(17, 0), "slot_minutes": 15},
            )
            DoctorAvailability.objects.get_or_create(
                doctor=doc2_profile,
                day_of_week=day,
                start_time=time(10, 0),
                defaults={"end_time": time(16, 0), "slot_minutes": 20},
            )

        # 3. Medicine Catalog & Batches
        self.stdout.write("Populating Medicines Catalog & Batches...")
        meds_data = [
            ("Paracetamol", "Acetaminophen", MedicineForm.TABLET, "500mg", 100, 350),
            ("Cetirizine", "Cetirizine Hydrochloride", MedicineForm.TABLET, "10mg", 50, 200),
            ("Ibuprofen", "Ibuprofen", MedicineForm.TABLET, "400mg", 50, 180),
            ("ORS Sachet", "Oral Rehydration Salts", MedicineForm.SACHET, "21.8g", 50, 250),
            ("Pantoprazole", "Pantoprazole Sodium", MedicineForm.TABLET, "40mg", 50, 150),
            ("Amoxicillin", "Amoxicillin Trihydrate", MedicineForm.CAPSULE, "500mg", 40, 120),
            ("Cough Syrup", "Dextromethorphan HBr", MedicineForm.SYRUP, "100ml", 25, 80),
            ("Diclofenac Gel", "Diclofenac Diethylamine", MedicineForm.OINTMENT, "30g", 20, 60),
            ("Azithromycin", "Azithromycin Dihydrate", MedicineForm.TABLET, "500mg", 30, 90),
            ("Dolo 650", "Paracetamol", MedicineForm.TABLET, "650mg", 100, 300),
        ]

        medicines_dict = {}
        today = timezone.now().date()
        exp_next_year = today + timedelta(days=400)

        for name, generic, form, strength, reorder, stock in medss_data if 'medss_data' in locals() else meds_data:
            med, _ = Medicine.objects.update_or_create(
                name=name,
                strength=strength,
                form=form,
                defaults={"generic_name": generic, "reorder_level": reorder},
            )
            medicines_dict[name] = med

            # Create or update batch
            MedicineInventory.objects.update_or_create(
                medicine=med,
                batch_number=f"BATCH-2026-{name[:3].upper()}",
                defaults={
                    "quantity": stock,
                    "expiry_date": exp_next_year,
                    "updated_by": pharma_profile,
                },
            )

        # 4. Today's Appointments & Pharmacist Queue
        self.stdout.write("Creating today's Queue and Prescriptions...")

        # Token 1 (Emergency): Ananya Gupta -> Dr. Doom
        ananya = student_profiles["ananya.gupta@iitrpr.ac.in"]
        apt1, _ = Appointment.objects.update_or_create(
            student=ananya,
            doctor=doc1_profile,
            appointment_date=today,
            defaults={
                "appointment_time": time(9, 30),
                "token_number": 1,
                "is_emergency": True,
                "status": AppointmentStatus.COMPLETED,
                "reason": "Acute allergic urticaria and wheezing",
            },
        )
        rx1, _ = Prescription.objects.update_or_create(
            appointment=apt1,
            defaults={
                "student": ananya,
                "doctor": doc1_profile,
                "instructions": "Take cetirizine immediately. Keep ORS handy.",
                "status": PrescriptionStatus.PENDING,
                "payment_status": PaymentStatus.CREDIT_STUDENT,
            },
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=rx1, medicine=medicines_dict["Cetirizine"],
            defaults={"dosage_frequency": "1-0-1", "duration_days": 5, "prescribed_quantity": 10},
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=rx1, medicine=medicines_dict["Paracetamol"],
            defaults={"dosage_frequency": "1-0-1", "duration_days": 3, "prescribed_quantity": 6},
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=rx1, medicine=medicines_dict["ORS Sachet"],
            defaults={"dosage_frequency": "As needed", "duration_days": 3, "prescribed_quantity": 4},
        )

        # Token 2: Vikram Patel -> Dr. Doom
        vikram = student_profiles["vikram.patel@iitrpr.ac.in"]
        apt2, _ = Appointment.objects.update_or_create(
            student=vikram,
            doctor=doc1_profile,
            appointment_date=today,
            defaults={
                "appointment_time": time(10, 0),
                "token_number": 2,
                "is_emergency": False,
                "status": AppointmentStatus.COMPLETED,
                "reason": "Right ankle sprain during football match",
            },
        )
        rx2, _ = Prescription.objects.update_or_create(
            appointment=apt2,
            defaults={
                "student": vikram,
                "doctor": doc1_profile,
                "instructions": "Apply gel gently 3 times a day. Ice compress for 48 hours.",
                "status": PrescriptionStatus.PENDING,
                "payment_status": PaymentStatus.CREDIT_STUDENT,
            },
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=rx2, medicine=medicines_dict["Ibuprofen"],
            defaults={"dosage_frequency": "1-0-1 after food", "duration_days": 3, "prescribed_quantity": 6},
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=rx2, medicine=medicines_dict["Diclofenac Gel"],
            defaults={"dosage_frequency": "Apply TDS", "duration_days": 5, "prescribed_quantity": 1},
        )

        # Token 3: Sneha Reddy -> Dr. Doom
        sneha = student_profiles["sneha.reddy@iitrpr.ac.in"]
        apt3, _ = Appointment.objects.update_or_create(
            student=sneha,
            doctor=doc1_profile,
            appointment_date=today,
            defaults={
                "appointment_time": time(10, 30),
                "token_number": 3,
                "is_emergency": False,
                "status": AppointmentStatus.COMPLETED,
                "reason": "Bacterial pharyngitis and acid reflux",
            },
        )
        rx3, _ = Prescription.objects.update_or_create(
            appointment=apt3,
            defaults={
                "student": sneha,
                "doctor": doc1_profile,
                "instructions": "Complete 5 day course of Amoxicillin without missing a dose.",
                "status": PrescriptionStatus.PENDING,
                "payment_status": PaymentStatus.CREDIT_STUDENT,
            },
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=rx3, medicine=medicines_dict["Amoxicillin"],
            defaults={"dosage_frequency": "1-0-1", "duration_days": 5, "prescribed_quantity": 10},
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=rx3, medicine=medicines_dict["Pantoprazole"],
            defaults={"dosage_frequency": "1-0-0 empty stomach", "duration_days": 5, "prescribed_quantity": 5},
        )

        # Token 4: Aarav Sharma -> Dr. Doom (active in doctor queue)
        apt4, _ = Appointment.objects.update_or_create(
            student=student1_profile,
            doctor=doc1_profile,
            appointment_date=today,
            defaults={
                "appointment_time": time(11, 0),
                "token_number": 4,
                "is_emergency": False,
                "status": AppointmentStatus.BOOKED,
                "reason": "Persistent dry cough and low-grade evening fever",
            },
        )

        # 5. Historical Visits for Aarav Sharma (Patient History View)
        self.stdout.write("Seeding patient visit history for Aarav Sharma...")
        past_dates = [today - timedelta(days=14), today - timedelta(days=45), today - timedelta(days=90)]

        # Past Visit 1: Viral Fever
        p_apt1, _ = Appointment.objects.update_or_create(
            student=student1_profile,
            doctor=doc1_profile,
            appointment_date=past_dates[0],
            defaults={
                "appointment_time": time(10, 15),
                "token_number": 8,
                "status": AppointmentStatus.COMPLETED,
                "reason": "High fever and body ache",
            },
        )
        MedicalRecord.objects.update_or_create(
            appointment=p_apt1,
            defaults={
                "student": student1_profile,
                "doctor": doc1_profile,
                "complaints": [{"complaint": "High fever and chills", "duration": "2 days"}],
                "examination": {"temperature": "101.4 F", "bp": "118/78", "pulse": "84"},
                "diagnosis": "Acute Viral Pyrexia",
                "doctor_notes": "Hydrate well and rest. Monitor temperature every 6 hours.",
            },
        )
        p_rx1, _ = Prescription.objects.update_or_create(
            appointment=p_apt1,
            defaults={
                "student": student1_profile,
                "doctor": doc1_profile,
                "instructions": "Take paracetamol when temp > 100 F. Complete ORS.",
                "status": PrescriptionStatus.DISPENSED,
                "payment_status": PaymentStatus.CREDIT_STUDENT,
                "dispensed_by": pharma_profile,
                "dispensed_at": timezone.now() - timedelta(days=14),
            },
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=p_rx1, medicine=medicines_dict["Paracetamol"],
            defaults={"dosage_frequency": "1-0-1", "duration_days": 3, "prescribed_quantity": 6, "dispensed_quantity": 6},
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=p_rx1, medicine=medicines_dict["ORS Sachet"],
            defaults={"dosage_frequency": "As needed", "duration_days": 2, "prescribed_quantity": 2, "dispensed_quantity": 2},
        )

        # Past Visit 2: Acid Reflux / Gastritis
        p_apt2, _ = Appointment.objects.update_or_create(
            student=student1_profile,
            doctor=doc1_profile,
            appointment_date=past_dates[1],
            defaults={
                "appointment_time": time(11, 30),
                "token_number": 12,
                "status": AppointmentStatus.COMPLETED,
                "reason": "Epigastric pain and sour burps",
            },
        )
        MedicalRecord.objects.update_or_create(
            appointment=p_apt2,
            defaults={
                "student": student1_profile,
                "doctor": doc1_profile,
                "complaints": [{"complaint": "Burning sensation in upper abdomen", "duration": "4 days"}],
                "examination": {"temperature": "98.4 F", "bp": "120/80", "pulse": "76"},
                "diagnosis": "Mild Gastroduodenitis",
                "doctor_notes": "Avoid spicy hostel mess food and late night caffeine.",
            },
        )
        p_rx2, _ = Prescription.objects.update_or_create(
            appointment=p_apt2,
            defaults={
                "student": student1_profile,
                "doctor": doc1_profile,
                "instructions": "Take pantoprazole 30 mins before breakfast.",
                "status": PrescriptionStatus.DISPENSED,
                "payment_status": PaymentStatus.CREDIT_STUDENT,
                "dispensed_by": pharma_profile,
                "dispensed_at": timezone.now() - timedelta(days=45),
            },
        )
        PrescriptionMedicine.objects.update_or_create(
            prescription=p_rx2, medicine=medicines_dict["Pantoprazole"],
            defaults={"dosage_frequency": "1-0-0 empty stomach", "duration_days": 7, "prescribed_quantity": 7, "dispensed_quantity": 7},
        )

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
