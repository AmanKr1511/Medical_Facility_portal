"""
accounts/permissions.py

Custom DRF permission classes for role-based access control.
"""
from rest_framework.permissions import BasePermission

from .models import UserRole


class IsDoctor(BasePermission):
    """Allow access only to users with role=DOCTOR."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.DOCTOR
        )


class IsPharmacist(BasePermission):
    """Allow access only to users with role=PHARMACIST."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.PHARMACIST
        )


class IsStudent(BasePermission):
    """Allow access only to users with role=STUDENT."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.STUDENT
        )


class IsAdmin(BasePermission):
    """Allow access only to users with role=ADMIN."""
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsDoctorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.DOCTOR, UserRole.ADMIN)
        )


class IsPharmacistOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (UserRole.PHARMACIST, UserRole.ADMIN)
        )
