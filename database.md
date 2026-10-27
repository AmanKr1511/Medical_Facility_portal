# Database Documentation — SYNapse Medical Facility Portal

## 1. Database Engine & Connection

- **Database Engine:** PostgreSQL 16 (with SQLite fallback for local development)
- **Host:** `synapse-postgres` (Docker service) / `localhost`
- **Port:** `5432`
- **Database Name:** `synapse_db`
- **User:** `synapse_user`
- **Password:** `synapse_pass`
- **ORM:** Django ORM (Django 5.1 + Django REST Framework)
- **Default Auto Field:** `BigAutoField` (auto-incrementing 64-bit integer primary keys)

### Connection Configuration (from `config/settings.py`)

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="synapse_db"),
        "USER": config("DB_USER", default="synapse_user"),
        "PASSWORD": config("DB_PASSWORD", default="synapse_pass"),
        "HOST": config("DB_HOST", default="synapse-postgres"),
        "PORT": config("DB_PORT", default="5432"),
    }
}
```

---

## 2. How Data Is Sent to the Database

### Current Approach: Django ORM (Model-Based)
---

## 3. Database Schema

### Table: auth_user (Custom User Model)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | Auto-incrementing ID |
| email | EmailField | UNIQUE, indexed | User email (login identifier) |
| password | CharField | - | Hashed password (Django) |
| role | CharField(20) | Choices: student, doctor, pharmacist, admin | User role |
| is_active | BooleanField | default=True | Account active flag |
### Table: student_profile

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| user_id | OneToOneField -> auth_user | CASCADE | Linked user |
| roll_no | CharField(30) | UNIQUE, indexed | Student roll number |
| name | CharField(150) | - | Student name |
| phone | CharField(15) | blank=True | Phone number |
| department | CharField(100) | - | Department |
| program | CharField(50) | - | Program (B.Tech, M.Tech, PhD, etc.) |
| year | IntegerField | null, blank | Year of study |
| hostel | CharField(100) | blank=True | Hostel name |
| date_of_birth | DateField | null, blank | DOB |
| gender | CharField(10) | blank=True | Gender |
| blood_group | CharField(10) | blank=True | Blood group |
| allergies | TextField | blank=True | Known allergies |
| current_medicines | TextField | blank=True | Current medications |
| past_illness | TextField | blank=True | Past illnesses |
| emergency_contact_name | CharField(150) | blank=True | Emergency contact |
| emergency_contact_phone | CharField(15) | blank=True | Emergency phone |

### Table: doctor_profile

### Table: doctor_availability

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| doctor_id | ForeignKey -> doctor_profile | CASCADE | |
| day_of_week | IntegerField | choices 0-6 (Mon-Sun) | Day of week |
| start_time | TimeField | - | Start time |
| end_time | TimeField | - | End time |
| slot_minutes | PositiveIntegerField | default=15 | Slot duration |
| **Unique Together:** | | (doctor, day_of_week, start_time) | |

### Table: appointment

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| student_id | ForeignKey -> student_profile | CASCADE | Patient |
| doctor_id | ForeignKey -> doctor_profile | CASCADE | Doctor |
| appointment_date | DateField | indexed | Appointment date |
| appointment_time | TimeField | - | Appointment time |
| token_number | PositiveIntegerField | null, blank, indexed | FCFS token number |
| opd_number | CharField | NOT NULL, indexed | OPD number (e.g., "OPD-001") |
| status | CharField(20) | choices: BOOKED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW | Status |
| is_emergency | BooleanField | default=False | Emergency flag |
| reminder_sent | BooleanField | default=False | Reminder sent flag |
| reason | TextField | blank=True | Visit reason |
| created_at | DateTimeField | auto_now_add | Record creation |
### Table: prescription

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| appointment_id | OneToOneField -> appointment | CASCADE | Linked appointment |
| student_id | ForeignKey -> student_profile | CASCADE | Patient |
| doctor_id | ForeignKey -> doctor_profile | CASCADE | Doctor |
| instructions | TextField | blank=True | Doctor instructions |
| status | CharField(20) | choices: PENDING, DISPENSED, PARTIAL | Dispensation status |
| payment_status | CharField(20) | choices: CREDIT_STUDENT, PAID_CASH, PENDING_CASH | Payment status |
| dispensed_by_id | ForeignKey -> pharmacist_profile | SET_NULL, null, blank | Dispensing pharmacist |
| prescribed_at | DateTimeField | auto_now_add | Prescription creation |
| dispensed_at | DateTimeField | null, blank | Dispensation time |
| **Ordering:** | | -prescribed_at (newest first) | |

### Table: prescription_medicine

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| prescription_id | ForeignKey -> prescription | CASCADE | Parent prescription |
| medicine_id | ForeignKey -> pharmacy.Medicine | CASCADE | Medicine reference |
| dosage_frequency | CharField(100) | - | e.g., "1-0-1", "Once daily after food" |
| duration_days | PositiveIntegerField | default=3 | Duration in days |
| prescribed_quantity | PositiveIntegerField | default=1 | Quantity prescribed by doctor |
| dispensed_quantity | PositiveIntegerField | default=0 | Quantity dispensed by pharmacist |
| pharmacist_notes | CharField(255) | blank=True | Notes on substitution/partial dispensing |
---

## 4. Entity Relationship Summary

```
User (auth_user)
├── StudentProfile (1:1)
│   └── Appointment (1:N) → DoctorProfile
│       ├── MedicalRecord (1:1)
│       └── Prescription (1:1)
│           └── PrescriptionMedicine (1:N) → Medicine
├── DoctorProfile (1:1)
│   ├── DoctorAvailability (1:N)
│   └── Appointment (1:N)
├── PharmacistProfile (1:1)
│   ├── Prescription.dispensed_by (1:N)
│   └── MedicineInventory.updated_by (1:N)
│
Medicine (1:N) → MedicineInventory (batches)
```

---

## 5. ORM Query Examples

### Get pending prescriptions for today's queue
```python
Prescription.objects.filter(
    status__in=["PENDING", "PARTIAL"],
    appointment__appointment_date=today,
).select_related("appointment", "student", "doctor").prefetch_related("medicines__medicine")
```

### Get patient visit history
```python
Appointment.objects.filter(
    student=student_profile,
    status="COMPLETED",
).select_related("student", "doctor", "medical_record").prefetch_related("prescription__medicines__medicine")
```

### Get non-expired batches (FEFO order)
```python
MedicineInventory.objects.filter(
    medicine_id=medicine_id,
    expiry_date__gte=today,
    quantity__gt=0,
).order_by("expiry_date")
```

---

## 6. Migration Files

| App | Migration | Description |
|-----|-----------|-------------|
| accounts | 0001_initial | User, StudentProfile, DoctorProfile, PharmacistProfile |
| clinical | 0001_initial | All clinical models |
| clinical | 0002_appointment_reminder_sent | Added reminder_sent field to Appointment |
| pharmacy | 0001_initial | Medicine, MedicineInventory |

---

## 7. Database Backup

- **Automated:** Celery Beat runs nightly_database_backup at 23:00 IST
- **Manual:** python manage.py backup_db
- **Output:** synapse-backend/backups/synapse_backup_<timestamp>.sql.gz
- **Optional:** Google Drive sync via GDRIVE_BACKUP_FOLDER_ID and GDRIVE_SERVICE_ACCOUNT_FILE

### Table: medicine

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| name | CharField(200) | indexed | Medicine name |
| generic_name | CharField(200) | indexed | Generic name |
| form | CharField(50) | choices: Tablet, Capsule, Syrup, etc. | Dosage form |
| strength | CharField(50) | - | e.g., "500mg", "10ml" |
| reorder_level | PositiveIntegerField | default=50 | Low stock alert threshold |
| **Unique Together:** | | (name, strength, form) | |

### Table: medicine_inventory

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| medicine_id | ForeignKey -> medicine | CASCADE | Medicine reference |
| batch_number | CharField(100) | indexed | Batch number |
| quantity | PositiveIntegerField | default=0 | Current stock quantity |
| expiry_date | DateField | indexed | Batch expiry date |
| updated_by_id | ForeignKey -> pharmacist_profile | SET_NULL, null, blank | Last updated by |
| updated_at | DateTimeField | auto_now | Last update time |
| **Unique Together:** | | (medicine, batch_number) | |
| **Ordering:** | | expiry_date (FEFO) | |

### Table: medical_record

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| appointment_id | OneToOneField -> appointment | CASCADE | Linked appointment |
| student_id | ForeignKey -> student_profile | CASCADE | Patient |
| doctor_id | ForeignKey -> doctor_profile | CASCADE | Doctor |
| complaints | JSONField | default=list | List of {complaint, duration} |
| examination | JSONField | default=dict | Vitals: {temperature, bp, pulse, spo2, oe, remarks} |
| symptoms | TextField | blank=True | Symptoms |
| diagnosis | TextField | - | Diagnosis |
| doctor_notes | TextField | blank=True | Doctor notes |
| diagnostic_reports | JSONField | default=list, blank | List of {id, name, type, date, summary} |
| selected_tests | JSONField | default=list, blank | Ordered lab tests |
| created_at | DateTimeField | auto_now_add | Record creation |
| updated_at | DateTimeField | auto_now | Last update |
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| user_id | OneToOneField -> auth_user | CASCADE | Linked user |
| name | CharField(150) | - | Doctor name |
| phone | CharField(15) | blank=True | Phone number |
| specialization | CharField(100) | - | Specialization |
| qualification | CharField(100) | blank=True | Qualifications |
| cabin | CharField(50) | blank=True | OPD Room / Cabin |

### Table: pharmacist_profile

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BigAutoField | PK | |
| user_id | OneToOneField -> auth_user | CASCADE | Linked user |
| name | CharField(150) | - | Pharmacist name |
| phone | CharField(15) | blank=True | Phone number |
| is_staff | BooleanField | default=False | Django admin access |
| is_superuser | BooleanField | default=False | Django superuser flag |
| last_login | DateTimeField | null=True | Last login timestamp |
| date_joined | DateTimeField | auto_now_add | Account creation date |
| created_at | DateTimeField | auto_now_add | Record creation |

All data persistence in this project is handled through Django's Object-Relational Mapper (ORM). The frontend sends HTTP requests (JSON payloads) to Django REST Framework endpoints, which then use Django ORM methods to interact with PostgreSQL.

**Key ORM operations used:**

| Operation | ORM Method | Example Location |
|-----------|------------|------------------|
| Create | `Model.objects.create(...)` | `clinical/views.py` — `PrescriptionMedicine.objects.create(...)` |
| Read/Query | `Model.objects.filter(...)` | `pharmacy/views.py` — `Prescription.objects.filter(status__in=["PENDING", "PARTIAL"])` |
| Update | `instance.save(update_fields=[...])` | `pharmacy/views.py` — `batch.save(update_fields=["quantity", ...])` |
| Upsert | `Model.objects.update_or_create(...)` | `clinical/views.py` — `MedicalRecord.objects.update_or_create(...)` |
| Get or Create | `Model.objects.get_or_create(...)` | `clinical/views.py` — `User.objects.get_or_create(...)` |
| Atomic Transactions | `transaction.atomic()` | Used in appointment booking, dispensation, consultation |

### Form vs ORM — Important Note

> **If you are currently sending data via Django Forms (HTML form submissions) and cannot retrieve it via ORM, the issue is likely one of the following:**

1. **Django Forms vs DRF Serializers:** The frontend communicates via JSON REST API, not HTML forms. Django Forms are designed for server-rendered HTML templates, not API endpoints. Use **DRF Serializers** (`serializers.ModelSerializer`) to parse and validate JSON payloads from the frontend.

2. **CSRF Tokens:** HTML forms require CSRF tokens. REST API calls use JWT authentication (`Authorization: Bearer <token>`), not session-based CSRF. Ensure your frontend sends `Authorization` headers, not form submissions.

3. **Data Flow:** The correct flow is:
   ```
   Frontend (JSON fetch) → DRF Serializer → validated_data → Django ORM → PostgreSQL
   ```

4. **How to query via ORM:** Once data is saved via ORM, you can query it directly:
   ```python
   # Get all pending prescriptions
   Prescription.objects.filter(status="PENDING")
   
   # Get appointments for a specific doctor on a date
   Appointment.objects.filter(doctor=doctor_profile, appointment_date=today)
   
   # Get a specific user by email
   User.objects.get(email="student@iitrpr.ac.in")
   ```

### API Authentication
- **Mechanism:** JWT (JSON Web Tokens) via SimpleJWT
- **Header:** `Authorization: Bearer <access_token>`
- **Token Lifetime:** 60 minutes (access), 7 days (refresh)
- **Custom Claims:** `role`, `name` embedded in JWT payload