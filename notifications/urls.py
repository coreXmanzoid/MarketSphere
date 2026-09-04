from django.urls import path

from notifications.views import clear_all_notifications, mark_all_notification_as_read

urlpatterns = [
    path("mark-all-as-read/<int:user_id>/", mark_all_notification_as_read, name="mark_all_notification_as_read"),
    path("clear-all/<int:user_id>/", clear_all_notifications, name="clear_all_notifications"),
]
