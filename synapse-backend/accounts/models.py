"""
accounts/models.py

Custom User model with email-based auth and RBAC roles.
Role-specific profile tables (StudentProfile, DoctorProfile, PharmacistProfile)
are separate to keep the auth table clean and allow null profiles for Admin users.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    STUDENT = "student", "Student"
    DOCTOR = "doctor", "Doctor"
    PHARMACIST = "pharmacist", "Pharmacist"
    ADMIN = "admin", "Admin"


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Single user table for all roles.
    JWT payload carries `role` and `name` custom claims.
    """
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.STUDENT,
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "auth_user"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def display_name(self):
        """Returns the profile name or email prefix."""
        if self.role == UserRole.STUDENT and hasattr(self, "student_profile"):
            return self.student_profile.name
        if self.role == UserRole.DOCTOR and hasattr(self, "doctor_profile"):
            return self.doctor_profile.name
        if self.role == UserRole.PHARMACIST and hasattr(self, "pharmacist_profile"):
            return self.pharmacist_profile.name
        return str(self.email).split("@")[0]


class StudentProfile(models.Model):
    """
    IIT Ropar students, research scholars, and (via email link) dependents.
    """
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="student_profile"
    )
    roll_no = models.CharField(max_length=30, unique=True, db_index=True)
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15, blank=True)
    department = models.CharField(max_length=100)
    program = models.CharField(max_length=50)
    year = models.IntegerField(null=True, blank=True)
    hostel = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True)
    blood_group = models.CharField(max_length=10, blank=True)
    # Medical history fields
    allergies = models.TextField(blank=True, help_text="Known allergies, comma-separated")
    current_medicines = models.TextField(blank=True)
    past_illness = models.TextField(blank=True)
    # Emergency contact
    emergency_contact_name = models.CharField(max_length=150, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True)

    class Meta:
        db_table = "student_profile"
        verbose_name = "Student Profile"
        verbose_name_plural = "Student Profiles"

    def __str__(self):
        return f"{self.name} ({self.roll_no})"


class DoctorProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="doctor_profile"
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15, blank=True)
    specialization = models.CharField(max_length=100)
    qualification = models.CharField(max_length=100, blank=True)
    cabin = models.CharField(max_length=50, blank=True, help_text="E.g. 'OPD Room 102'")

    class Meta:
        db_table = "doctor_profile"
        verbose_name = "Doctor Profile"
        verbose_name_plural = "Doctor Profiles"

    def __str__(self):
        return f"Dr. {self.name} — {self.specialization}"


class PharmacistProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="pharmacist_profile"
    )
    name = models.CharField(max_length=150)
    phone = models.CharField(max_length=15, blank=True)

    class Meta:
        db_table = "pharmacist_profile"
        verbose_name = "Pharmacist Profile"
        verbose_name_plural = "Pharmacist Profiles"

    def __str__(self):
        return str(self.name)
