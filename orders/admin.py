from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        "product",
        "price",
        "quantity",
        "total",
        "created_at",
    )
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "user",
        "status",
        "payment_status",
        "subtotal",
        "total",
        "created_at",
    )

    list_filter = (
        "status",
        "payment_status",
        "created_at",
    )

    search_fields = (
        "order_number",
        "user__username",
        "user__email",
        "shipping_name",
        "shipping_phone",
    )

    readonly_fields = (
        "order_number",
        "subtotal",
        "shipping_cost",
        "discount",
        "tax",
        "total",
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Order Information",
            {
                "fields": (
                    "order_number",
                    "user",
                    "status",
                    "payment_status",
                )
            },
        ),
        (
            "Shipping Details",
            {
                "fields": (
                    "shipping_name",
                    "shipping_phone",
                    "shipping_address",
                    "shipping_city",
                    "shipping_postal_code",
                )
            },
        ),
        (
            "Pricing",
            {
                "fields": (
                    "subtotal",
                    "shipping_cost",
                    "discount",
                    "tax",
                    "total",
                )
            },
        ),
        (
            "Additional Information",
            {
                "fields": (
                    "notes",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    inlines = [OrderItemInline]

    ordering = ("-created_at",)


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "product",
        "price",
        "quantity",
        "total",
        "created_at",
    )

    list_filter = (
        "created_at",
    )

    search_fields = (
        "order__order_number",
        "product__name",
    )

    readonly_fields = (
        "created_at",
    )

    ordering = ("-created_at",)