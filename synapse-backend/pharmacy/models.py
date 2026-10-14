"""
pharmacy/models.py

Medicine master catalogue and per-batch inventory.
"""
from django.db import models

from accounts.models import PharmacistProfile


class MedicineForm(models.TextChoices):
    TABLET = "Tablet", "Tablet"
    CAPSULE = "Capsule", "Capsule"
    SYRUP = "Syrup", "Syrup"
    OINTMENT = "Ointment", "Ointment"
    CREAM = "Cream", "Cream"
    DROPS = "Drops", "Drops"
    INJECTION = "Injection", "Injection"
    SACHET = "Sachet", "Sachet"
    INHALER = "Inhaler", "Inhaler"
    OTHER = "Other", "Other"


class Medicine(models.Model):
    """
    Master medicine catalogue. Only Admins can add new entries.
    Decision #3: Pharmacists manage batches/inventory; catalogue additions are Admin-only.
    """
    name = models.CharField(max_length=200, db_index=True)
    generic_name = models.CharField(max_length=200, db_index=True)
    form = models.CharField(max_length=50, choices=MedicineForm.choices)
    strength = models.CharField(max_length=50, help_text="e.g. '500mg', '10ml'")
    reorder_level = models.PositiveIntegerField(
        default=50,
        help_text="Alert threshold for low stock",
    )

    class Meta:
        db_table = "medicine"
        verbose_name = "Medicine"
        verbose_name_plural = "Medicines"
        unique_together = [("name", "strength", "form")]
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} {self.strength} ({self.form})"

    @property
    def total_stock(self):
        """Sum of all non-expired batches."""
        from django.utils import timezone
        return (
            self.batches.filter(expiry_date__gte=timezone.now().date())
            .aggregate(total=models.Sum("quantity"))["total"]
            or 0
        )

    @property
    def is_low_stock(self):
        return self.total_stock <= self.reorder_level


class MedicineInventory(models.Model):
    """
    Per-batch stock record. Dispensation deducts from the earliest-expiry batch.
    Managed via Django Admin by pharmacists.
    """
    medicine = models.ForeignKey(
        Medicine, on_delete=models.CASCADE, related_name="batches"
    )
    batch_number = models.CharField(max_length=100, db_index=True)
    quantity = models.PositiveIntegerField(default=0)
    expiry_date = models.DateField(db_index=True)
    updated_by = models.ForeignKey(
        PharmacistProfile, on_delete=models.SET_NULL, null=True, blank=True
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medicine_inventory"
        verbose_name = "Medicine Inventory Batch"
        verbose_name_plural = "Medicine Inventory Batches"
        ordering = ["expiry_date"]  # FEFO — First Expiry, First Out
        unique_together = [("medicine", "batch_number")]

    def __str__(self):
        return f"{self.medicine.name} batch {self.batch_number} qty={self.quantity} exp={self.expiry_date}"
