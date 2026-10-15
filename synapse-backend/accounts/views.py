"""
accounts/views.py — Auth & profile views.
"""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import DoctorProfile, PharmacistProfile, StudentProfile, UserRole
from .permissions import IsDoctor, IsPharmacist, IsStudent
from .serializers import (
    CustomTokenObtainPairSerializer,
    DoctorListSerializer,
    DoctorProfileSerializer,
    PharmacistProfileSerializer,
    StudentProfileSerializer,
)


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Returns: { access, refresh, user: { id, name, role } }
    Matches the frontend AuthContext.login() contract exactly.
    """
    serializer_class = CustomTokenObtainPairSerializer


class TokenRefreshView(TokenRefreshView):
    """POST /api/auth/refresh/ — silent token rotation."""
    pass


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token so it cannot be used again.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response(
                {"detail": "Invalid or already-used token."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


# ── Profile views ──────────────────────────────────────────────────────────

class StudentProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/accounts/profile/ for students."""
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_object(self):
        return self.request.user.student_profile


class DoctorProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/accounts/profile/ for doctors."""
    serializer_class = DoctorProfileSerializer
    permission_classes = [IsAuthenticated, IsDoctor]

    def get_object(self):
        return self.request.user.doctor_profile


class PharmacistProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/accounts/profile/ for pharmacists."""
    serializer_class = PharmacistProfileSerializer
    permission_classes = [IsAuthenticated, IsPharmacist]

    def get_object(self):
        return self.request.user.pharmacist_profile


class MeView(APIView):
    """
    GET /api/accounts/me/
    Returns the logged-in user's role + profile without requiring role-specific endpoint.
    Useful for the frontend to re-hydrate AuthContext after a page refresh.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = "patient" if user.role == "student" else user.role
        return Response({
            "id": user.id,
            "email": user.email,
            "role": role,
            "name": user.display_name,
        })


class DoctorListView(generics.ListAPIView):
    """
    GET /api/accounts/doctors/
    Public endpoint — lists all active doctors for appointment booking.
    """
    serializer_class = DoctorListSerializer
    permission_classes = []  # Public
    authentication_classes = []

    def get_queryset(self):
        return DoctorProfile.objects.filter(user__is_active=True).select_related("user")
