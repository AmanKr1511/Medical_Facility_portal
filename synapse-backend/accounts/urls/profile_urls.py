from django.urls import path

from accounts.views import (
    DoctorListView,
    DoctorProfileView,
    MeView,
    PharmacistProfileView,
    StudentProfileView,
)

urlpatterns = [
    path("me/", MeView.as_view(), name="accounts-me"),
    path("profile/student/", StudentProfileView.as_view(), name="student-profile"),
    path("profile/doctor/", DoctorProfileView.as_view(), name="doctor-profile"),
    path("profile/pharmacist/", PharmacistProfileView.as_view(), name="pharmacist-profile"),
    path("doctors/", DoctorListView.as_view(), name="doctor-list"),
]
