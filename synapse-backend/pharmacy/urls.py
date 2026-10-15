from django.urls import path

from .views import (
    DispensePrescriptionView,
    MedicineBatchListView,
    MedicineListView,
    PharmacistQueueView,
)

urlpatterns = [
    path("queue/", PharmacistQueueView.as_view(), name="pharmacist-queue"),
    path("dispense/<int:prescription_id>/", DispensePrescriptionView.as_view(), name="dispense"),
    path("medicines/", MedicineListView.as_view(), name="medicine-list"),
    path("medicines/<int:medicine_id>/batches/", MedicineBatchListView.as_view(), name="medicine-batches"),
]
