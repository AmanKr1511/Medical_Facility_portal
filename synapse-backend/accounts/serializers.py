"""
accounts/serializers.py

- CustomTokenObtainPairSerializer: injects role and name into JWT payload
  and returns them in the login response body so the frontend can store
  them in AuthContext without a second API call.
- Profile read/update serializers for each role.
"""
from typing import Any

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import DoctorProfile, PharmacistProfile, StudentProfile, User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the standard SimpleJWT serializer to:
      1. Embed role and name in the JWT claims.
      2. Return them in the login response body so the SPA can populate
         AuthContext immediately (matches Section 6 contract).
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        raw_role = getattr(user, "role", "student")
        role = "patient" if raw_role == "student" else raw_role
        token["role"] = role
        token["name"] = getattr(user, "display_name", "")
        return token

    def validate(self, attrs):
        # Allow either 'email' or 'username' in request payload
        raw_identifier = (attrs.get(self.username_field) or attrs.get("username") or "").strip()
        demo_aliases = {
            "p-101": "student@iitrpr.ac.in",
            "doc-201": "doctor@iitrpr.ac.in",
            "ph-301": "pharmacist@iitrpr.ac.in",
        }

        if raw_identifier in demo_aliases:
            attrs[self.username_field] = demo_aliases[raw_identifier]
        elif raw_identifier and "@" not in raw_identifier:
            # Check if it matches a student roll number
            student = StudentProfile.objects.filter(roll_no__iexact=raw_identifier).first()
            if student:
                attrs[self.username_field] = student.user.email
            else:
                attrs[self.username_field] = raw_identifier
        elif raw_identifier:
            attrs[self.username_field] = raw_identifier

        data: dict[str, Any] = dict(super().validate(attrs))
        user = self.user
        raw_role = getattr(user, "role", "student")
        role = "patient" if raw_role == "student" else raw_role
        data["user"] = {
            "id": getattr(user, "id", None),
            "email": getattr(user, "email", ""),
            "name": getattr(user, "display_name", ""),
            "role": role,
        }
        return data


# ── Student ────────────────────────────────────────────────────────────────

class StudentProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id", "email", "roll_no", "name", "phone", "department",
            "program", "year", "hostel", "date_of_birth", "gender",
            "blood_group", "allergies", "current_medicines", "past_illness",
            "emergency_contact_name", "emergency_contact_phone",
        ]
        read_only_fields = ["id", "email", "roll_no"]


# ── Doctor ─────────────────────────────────────────────────────────────────

class DoctorProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = ["id", "email", "name", "phone", "specialization", "qualification", "cabin"]
        read_only_fields = ["id", "email"]


class DoctorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for appointment booking — public, no PII."""
    class Meta:
        model = DoctorProfile
        fields = ["id", "name", "specialization", "qualification", "cabin"]


# ── Pharmacist ─────────────────────────────────────────────────────────────

class PharmacistProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = PharmacistProfile
        fields = ["id", "email", "name", "phone"]
        read_only_fields = ["id", "email"]
