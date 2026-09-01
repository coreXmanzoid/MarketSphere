from django.urls import reverse

from notifications.services.email import send_marketplace_email
from django.conf import settings


def _get_absolute_url(path):
    return f"{settings.SITE_URL.rstrip('/')}/{path.lstrip('/')}"


def _get_application_url():
    path = reverse("seller-account")
    return _get_absolute_url(path)


def _get_seller_dashboard_url():
    path = reverse("dashboard")
    return _get_absolute_url(path)

def send_application_incomplete_email(seller):
    user = seller.user
    application = seller.application

    if not user.email:
        return False

    return send_marketplace_email(
        subject="Complete Your Seller Application — MarketSphere",
        recipient=user.email,
        template="email_management/sellers/application_incomplete.html",
        context={
            "recipient_name": user.first_name or user.username,
            "seller": seller,
            "application": application,
            "application_url": _get_application_url(),
        },
    )


def send_application_received_email(application):
    seller = application.seller
    user = seller.user

    if not user.email:
        return False

    return send_marketplace_email(
        subject="Seller Application Received — MarketSphere",
        recipient=user.email,
        template="email_management/sellers/application_received.html",
        context={
            "recipient_name": user.first_name or user.username,
            "seller": seller,
            "application": application,
            "application_url": _get_application_url(),
        },
    )


def send_seller_verified_email(seller):
    user = seller.user

    print("SELLER VERIFIED EMAIL")
    print("Recipient:", user.email)

    if not user.email:
        print("No email address.")
        return False

    result = send_marketplace_email(
        subject="Your Seller Account Is Verified — MarketSphere",
        recipient=user.email,
        template="email_management/sellers/verified.html",
        context={
            "recipient_name": user.first_name or user.username,
            "seller": seller,
            "seller_dashboard_url": _get_seller_dashboard_url(),
        },
    )

    print("Email result:", result)

    return result

def send_seller_rejected_email(application, rejection_reason=None):
    seller = application.seller
    user = seller.user

    if not user.email:
        return False

    return send_marketplace_email(
        subject="Seller Application Update — MarketSphere",
        recipient=user.email,
        template="email_management/sellers/rejected.html",
        context={
            "recipient_name": user.first_name or user.username,
            "seller": seller,
            "application": application,
            "rejection_reason": (
                rejection_reason
                or getattr(application, "rejection_reason", None)
            ),
            "application_url": _get_application_url(),
        },
    )
