"""
accounts/admin.py

Django Admin registrations for User and Role profiles.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import DoctorProfile, PharmacistProfile, StudentProfile, User


class StudentProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False
    extra = 0


class DoctorProfileInline(admin.StackedInline):
    model = DoctorProfile
    can_delete = False
    extra = 0


class PharmacistProfileInline(admin.StackedInline):
    model = PharmacistProfile
    can_delete = False
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "role", "display_name", "is_active", "is_staff", "created_at")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email",)
    ordering = ("email",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Role & Permissions", {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login",)}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "role", "password1", "password2", "is_staff", "is_active"),
            },
        ),
    )


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("roll_no", "name", "department", "program", "year", "phone", "blood_group")
    search_fields = ("roll_no", "name", "department", "user__email")
    list_filter = ("department", "program", "blood_group")


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "specialization", "qualification", "cabin", "phone")
    search_fields = ("name", "specialization", "cabin", "user__email")
    list_filter = ("specialization",)


@admin.register(PharmacistProfile)
class PharmacistProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "user")
    search_fields = ("name", "user__email")
