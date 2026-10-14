"""
Root URL configuration for the SYNapse backend.

Routing pattern:
  /api/auth/      — authentication (login, refresh, logout)
  /api/accounts/  — user profile management
  /api/clinical/  — appointments, records, prescriptions (doctor facing)
  /api/pharmacy/  — queue and dispensing (pharmacist facing)
  /admin/         — Django admin (Admin / Pharmacist batch management)
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls.auth_urls")),
    path("api/accounts/", include("accounts.urls.profile_urls")),
    path("api/clinical/", include("clinical.urls")),
    path("api/pharmacy/", include("pharmacy.urls")),
    # Role-based route aliases matching Section 6 API contracts
    path("api/pharmacist/", include("pharmacy.urls")),
    path("api/patient/", include("clinical.urls")),
    path("api/doctor/", include("clinical.urls")),
]

