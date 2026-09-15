from django.contrib import admin
from .models import (
    StoreSettings,
    MarketplaceSettings,
    CheckoutSettings,
    CatalogSettings,
    NotificationSettings,
    AdminSettingsData,
    AdminAuditLog,
)


class SingletonModelAdmin(admin.ModelAdmin):
    """
    Base admin class for Singleton models.
    Prevents deletion and restricts addition if an instance already exists.
    """
    def has_add_permission(self, request):
        # Allow adding only if no instance exists yet
        return self.model.objects.count() == 0

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion of the singleton instance
        return False


@admin.register(StoreSettings)
class StoreSettingsAdmin(SingletonModelAdmin):
    list_display = ("marketplace_name", "business_name", "country", "updated_at")
    fieldsets = (
        ("Branding", {
            "fields": ("marketplace_name", "marketplace_logo", "marketplace_favicon", "marketplace_description")
        }),
        ("Business Info", {
            "fields": ("business_name", "business_address", "business_registration_number", "tax_registration_number")
        }),
        ("Contact & Support", {
            "fields": ("contact_email", "support_email", "phone", "support_url", "privacy_url", "terms_url")
        }),
        ("Localization", {
            "fields": ("country", "timezone", "currency", "language", "date_format", "time_format")
        }),
        ("Social Media", {
            "fields": ("social_facebook", "social_instagram", "social_twitter", "social_linkedin")
        }),
    )


@admin.register(MarketplaceSettings)
class MarketplaceSettingsAdmin(SingletonModelAdmin):
    list_display = ("__str__", "marketplace_online", "commission_type", "commission_rate", "updated_at")
    fieldsets = (
        ("Status & Registration", {
            "fields": ("marketplace_online", "buyer_registration", "seller_registration")
        }),
        ("Approvals & Reviews", {
            "fields": ("seller_approval_required", "product_approval_required", "buyer_reviews", "seller_reviews")
        }),
        ("Order Features", {
            "fields": ("guest_checkout", "multi_seller_orders")
        }),
        ("Featured Sections", {
            "fields": ("featured_products", "featured_sellers", "featured_brands")
        }),
        ("Financials", {
            "fields": ("commission_type", "commission_rate", "min_order_amount", "max_order_amount")
        }),
    )


@admin.register(CheckoutSettings)
class CheckoutSettingsAdmin(SingletonModelAdmin):
    list_display = ("__str__", "tax_calculation", "shipping_calculation", "updated_at")
    fieldsets = (
        ("Order Flow", {
            "fields": ("auto_confirm_orders", "order_number_format", "order_hold", "fraud_review")
        }),
        ("Cancellations & Returns", {
            "fields": ("allow_cancellation", "cancellation_window", "return_window")
        }),
        ("Checkout Rules", {
            "fields": ("guest_checkout", "min_checkout_amount", "require_email", "require_phone", "require_address")
        }),
        ("Financials", {
            "fields": ("tax_calculation", "shipping_calculation")
        }),
        ("Notes & Fulfillment", {
            "fields": ("allow_order_notes", "allow_seller_notes", "partial_orders", "split_orders", "backorders", "preorders")
        }),
    )


@admin.register(CatalogSettings)
class CatalogSettingsAdmin(SingletonModelAdmin):
    list_display = ("__str__", "low_stock_threshold", "brand_visibility", "updated_at")
    fields = (
        "brand_visibility", 
        "search_visibility", 
        "maximum_product_images", 
        "maximum_image_size_mb", 
        "low_stock_threshold"
    )


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(SingletonModelAdmin):
    list_display = ("__str__", "updated_at")


@admin.register(AdminSettingsData)
class AdminSettingsDataAdmin(SingletonModelAdmin):
    list_display = ("__str__", "updated_at")


@admin.register(AdminAuditLog)
class AdminAuditLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "admin", "action", "section", "setting_name", "ip_address")
    list_filter = ("action", "section", "timestamp")
    search_fields = ("admin__username", "admin__email", "setting_name", "old_value", "new_value", "ip_address")
    date_hierarchy = "timestamp"
    
    # Audit logs should be strictly read-only
    readonly_fields = ("admin", "action", "section", "setting_name", "old_value", "new_value", "timestamp", "ip_address")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False