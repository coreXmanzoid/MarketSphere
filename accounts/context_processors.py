# sellers/context_processors.py

from notifications.services.notifications import (
    get_notifications,
    get_unread_count,
)
from notifications.models import Notification


def seller_context(request):
    seller = None
    buyer_notifications = None
    buyer_unread_notifications_count = None
    seller_notifications = None
    seller_unread_notifications_count = None
    admin_notifications = None
    admin_unread_notifications_count = None

    if request.user.is_authenticated:
        seller = getattr(request.user, "seller_profile", None)

        buyer_notifications = get_notifications(request.user.id, audience=Notification.Audience.BUYER)
        buyer_unread_notifications_count = get_unread_count(request.user.id, audience=Notification.Audience.BUYER)

        if seller is not None:
            seller_notifications = get_notifications(request.user.id, audience=Notification.Audience.SELLER)
            seller_unread_notifications_count = get_unread_count(request.user.id, audience=Notification.Audience.SELLER)

        if request.user.is_staff:
            admin_notifications = get_notifications(request.user.id, audience=Notification.Audience.ADMIN)
            admin_unread_notifications_count = get_unread_count(request.user.id, audience=Notification.Audience.ADMIN)

    return {
        "seller": seller,

        "buyer_notifications": buyer_notifications,
        "buyer_unread_notifications_count": buyer_unread_notifications_count,

        "seller_notifications": seller_notifications,
        "seller_unread_notifications_count": seller_unread_notifications_count,

        "admin_notifications": admin_notifications,
        "admin_unread_notifications_count": admin_unread_notifications_count,
    }
