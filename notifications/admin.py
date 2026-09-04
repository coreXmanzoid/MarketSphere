from django.contrib import admin
from django.utils import timezone
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "recipient",
        "notification_type",
        "is_read",
        "created_at",
    )
    list_filter = (
        "is_read",
        "notification_type",
        "created_at",
    )
    search_fields = (
        "title",
        "message",
        "recipient__username", 
        "recipient__email",
    )
    readonly_fields = ("created_at",)
    raw_id_fields = ("recipient",)
    date_hierarchy = "created_at"
    
    actions = ["mark_as_read", "mark_as_unread"]

    @admin.action(description="Mark selected notifications as read")
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(request, "Selected notifications marked as read.")

    @admin.action(description="Mark selected notifications as unread")
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False, read_at=None)
        self.message_user(request, "Selected notifications marked as unread.")