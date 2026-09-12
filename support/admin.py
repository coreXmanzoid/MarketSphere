from django.contrib import admin

from .models import SupportMessage, SupportRequest


class SupportMessageInline(admin.TabularInline):
    model = SupportMessage
    extra = 0
    readonly_fields = [
        "sender",
        "sender_type",
        "created_at",
    ]


@admin.register(SupportRequest)
class SupportRequestAdmin(admin.ModelAdmin):

    list_display = [
        "id",
        "subject",
        "user",
        "request_type",
        "category",
        "status",
        "created_at",
        "updated_at",
    ]

    list_filter = [
        "request_type",
        "category",
        "status",
        "created_at",
    ]

    search_fields = [
        "subject",
        "message",
        "user__username",
        "user__email",
        "related_order__order_number",
    ]

    readonly_fields = [
        "created_at",
        "updated_at",
    ]

    inlines = [
        SupportMessageInline,
    ]

    ordering = [
        "-updated_at",
    ]


@admin.register(SupportMessage)
class SupportMessageAdmin(admin.ModelAdmin):

    list_display = [
        "request",
        "sender",
        "sender_type",
        "created_at",
    ]

    list_filter = [
        "sender_type",
        "created_at",
    ]

    search_fields = [
        "message",
        "request__subject",
        "sender__username",
        "sender__email",
    ]

    readonly_fields = [
        "created_at",
    ]
