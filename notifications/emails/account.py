from notifications.services.email import send_marketplace_email
from django.conf import settings
from django.urls import reverse


def _get_absolute_url(path):
    return f"{settings.SITE_URL.rstrip('/')}/{path.lstrip('/')}"


def _get_marketplace_url():
    path = reverse("home")
    return _get_absolute_url(path)


def _get_verification_url(user):
    path = reverse(
        "accounts:verify_email",
        kwargs={"uid": user.pk},
    )
    return _get_absolute_url(path)

def send_welcome_email(user):
    if not user.email:
        return False

    return send_marketplace_email(
        subject="Welcome to MarketSphere",
        recipient=user.email,
        template="email_management/account/welcome.html",
        context={
            "recipient_name": user.first_name or user.username,
            "user": user,
            "marketplace_url": _get_marketplace_url(),
        },
    )


def send_verification_email(user, activate_url):
    if not user.email:
        return False

    return send_marketplace_email(
        subject="Verify Your Email — MarketSphere",
        recipient=user.email,
        template="email_management/account/verification.html",
        context={
            "recipient_name": user.first_name or user.username,
            "user": user,
            "activate_url": activate_url,
        },
    )
