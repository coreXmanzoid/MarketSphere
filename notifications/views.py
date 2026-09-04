from django.http import JsonResponse

from .services import notifications


def mark_all_notification_as_read(request, user_id):
    notifications.mark_all_as_read(user_id)
    return JsonResponse({"status": "success"})

def clear_all_notifications(request, user_id):
    deleted_count = notifications.clear_all_notifications(user_id)
    return JsonResponse({"status": "success", "deleted_count": deleted_count})