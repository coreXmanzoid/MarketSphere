from django.contrib import admin

from .models import Order, SellerOrder, OrderItem

# Register your models here.


class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "user",
        "payment_status",
        "total",
        "created_at",
    )

    list_filter = (
        "payment_status",
        "created_at",
    )

    search_fields = (
        "order_number",
        "user__username",
        "shipping_name",
        "shipping_phone",
    )

    list_editable = (
        "payment_status",
    )

    ordering = (
        "-created_at",
    )


class SellerOrderAdmin(admin.ModelAdmin):
    list_display = (
        "order",
        "seller",
        "status",
        "total",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "order__order_number",
        "seller__store_name",
        "tracking_number",
    )

    list_editable = (
        "status",
    )

    ordering = (
        "-created_at",
    )


class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "seller_order",
        "product",
        "quantity",
        "price",
        "total",
    )

    list_filter = (
        "created_at",
    )

    search_fields = (
        "seller_order__order__order_number",
        "product__name",
    )

    ordering = (
        "-created_at",
    )


admin.site.register(Order, OrderAdmin)
admin.site.register(SellerOrder, SellerOrderAdmin)
admin.site.register(OrderItem, OrderItemAdmin)