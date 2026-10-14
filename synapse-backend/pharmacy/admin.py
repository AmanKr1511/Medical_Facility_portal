"""
pharmacy/admin.py

Django Admin registrations for Medicine catalog and MedicineInventory batches.
Decision #3: Pharmacists manage stock batches here; master catalog additions can be restricted.
"""
from django.contrib import admin
from django.utils.html import format_html

from .models import Medicine, MedicineInventory


class MedicineInventoryInline(admin.TabularInline):
    model = MedicineInventory
    extra = 1
    fields = ["batch_number", "quantity", "expiry_date", "updated_by"]
    readonly_fields = ["updated_by"]


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ["name", "generic_name", "form", "strength", "total_stock_display", "reorder_level", "stock_status"]
    list_filter = ["form"]
    search_fields = ["name", "generic_name"]
    inlines = [MedicineInventoryInline]

    def total_stock_display(self, obj):
        return obj.total_stock
    total_stock_display.short_description = "Available Stock"

    def stock_status(self, obj):
        stock = obj.total_stock
        if stock == 0:
            return format_html('<span style="color:red; font-weight:bold;">Out of Stock</span>')
        elif stock <= obj.reorder_level:
            return format_html('<span style="color:orange; font-weight:bold;">Low Stock ({})</span>', stock)
        return format_html('<span style="color:green;">In Stock ({})</span>', stock)
    stock_status.short_description = "Status"


@admin.register(MedicineInventory)
class MedicineInventoryAdmin(admin.ModelAdmin):
    list_display = ["batch_number", "medicine", "quantity", "expiry_date", "updated_by", "updated_at"]
    list_filter = ["expiry_date", "medicine__form"]
    search_fields = ["batch_number", "medicine__name", "medicine__generic_name"]
    readonly_fields = ["updated_at"]

    def save_model(self, request, obj, form, change):
        if hasattr(request.user, "pharmacist_profile"):
            obj.updated_by = request.user.pharmacist_profile
        super().save_model(request, obj, form, change)
