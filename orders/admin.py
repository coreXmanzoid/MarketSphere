from django.contrib import admin

from .models import Order, OrderItem


class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "user",
        "seller",
        "status",
        "payment_status",
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
        "seller__store_name",
        "shipping_name",
        "shipping_phone",
    )

    list_editable = (
        "status",
        "payment_status",
    )

    ordering = (
        "-created_at",
    )


class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "product",
        "quantity",
        "price",
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

    ordering = (
        "-created_at",
    )


admin.site.register(Order, OrderAdmin)
admin.site.register(OrderItem, OrderItemAdmin)