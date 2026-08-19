from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    User, 
    Address, 
    Seller, 
    SellerApplication, 
    SellerApplicationDocument, 
    SellerApplicationFlag, 
    SellerSettings, 
    SellerProfile
)

# Register your models here.

class UserAdmin(admin.ModelAdmin):
    list_display = (
        "username",
        "email",
        "account_status",
        "is_active",
        "is_staff",
    )

    list_filter = (
        "account_status",
        "is_active",
        "is_staff",
    )

    search_fields = (
        "username",
        "email",
        "contact",
    )

    list_editable = (
        "account_status",
        "is_active",
    )

    ordering = (
        "username",
    )


class AddressAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "address_type",
        "full_name",
        "city",
        "is_default",
    )

    list_filter = (
        "address_type",
        "is_default",
        "city",
    )

    search_fields = (
        "user__username",
        "full_name",
        "phone",
        "city",
    )

    list_editable = (
        "is_default",
    )

    ordering = (
        "-is_default",
        "-created_at",
    )


class SellerAdmin(admin.ModelAdmin):
    list_display = (
        "store_name",
        "user",
        "store_email",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "store_name",
        "user__username",
        "store_email",
    )

    prepopulated_fields = {
        "slug": ("store_name",)
    }

    list_editable = (
        "status",
    )

    ordering = (
        "-created_at",
    )


class SellerApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "seller",
        "status",
        "priority",
        "assigned_to",
        "submitted_at",
    )

    list_filter = (
        "status",
        "priority",
        "assigned_to",
    )

    search_fields = (
        "seller__store_name",
        "referral_code",
    )

    list_editable = (
        "status",
        "priority",
    )

    ordering = (
        "-created_at",
    )


class SellerApplicationDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "application",
        "document_type",
        "verified",
        "uploaded_at",
    )

    list_filter = (
        "document_type",
        "verified",
    )

    search_fields = (
        "application__seller__store_name",
    )

    list_editable = (
        "verified",
    )

    ordering = (
        "-uploaded_at",
    )


class SellerApplicationFlagAdmin(admin.ModelAdmin):
    list_display = (
        "application",
        "title",
        "severity",
        "resolved",
    )

    list_filter = (
        "severity",
        "resolved",
    )

    search_fields = (
        "title",
        "application__seller__store_name",
    )

    list_editable = (
        "resolved",
    )

    ordering = (
        "-created_at",
    )


class SellerSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "seller",
        "default_handling_time",
        "business_registration_verified",
        "bank_account_verified",
        "address_verified",
    )

    list_filter = (
        "business_registration_verified",
        "bank_account_verified",
        "address_verified",
    )

    search_fields = (
        "seller__store_name",
        "business_registration_number",
        "tax_id",
    )

    list_editable = (
        "business_registration_verified",
        "bank_account_verified",
        "address_verified",
    )

    ordering = (
        "seller",
    )


class SellerProfileAdmin(admin.ModelAdmin):
    list_display = (
        "seller",
        "business_category",
        "business_type",
        "national_id_number",
    )

    list_filter = (
        "business_category",
        "business_type",
    )

    search_fields = (
        "seller__store_name",
        "national_id_number",
        "business_category",
    )

    ordering = (
        "seller",
    )


admin.site.register(User, UserAdmin)
admin.site.register(Address, AddressAdmin)
admin.site.register(Seller, SellerAdmin)
admin.site.register(SellerApplication, SellerApplicationAdmin)
admin.site.register(SellerApplicationDocument, SellerApplicationDocumentAdmin)
admin.site.register(SellerApplicationFlag, SellerApplicationFlagAdmin)
admin.site.register(SellerSettings, SellerSettingsAdmin)
admin.site.register(SellerProfile, SellerProfileAdmin)