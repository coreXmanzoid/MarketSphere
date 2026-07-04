from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

from . import validator

User = get_user_model()


def create_user(user):
    new_user = User.objects.create_user(
        first_name=user["first_name"],
        last_name=user["last_name"],
        username=user["username"],
        email=user["email"],
        contact=user["contact"],
        password=user["password"],
        account_status=User.AccountStatus.UNVERIFIED,
    )
    return new_user


def get_user_by_identifier(identifier):
    try:
        if validator.validate_identifier(identifier):
            return User.objects.get(email=identifier)
        return User.objects.get(username=identifier)
    except User.DoesNotExist:
        return None


def get_or_create_primary_email_address(user):
    email = (user.email or "").strip().lower()
    if not email:
        raise ValueError("User must have an email address before verification can be sent.")

    email_address, created = EmailAddress.objects.get_or_create(
        user=user,
        email=email,
        defaults={
            "primary": True,
            "verified": False,
        },
    )

    if created:
        return email_address

    if not email_address.primary:
        email_address.set_as_primary()

    return email_address


def send_verification_email(request, user, signup=False):
    email_address = get_or_create_primary_email_address(user)

    if email_address.verified:
        return False

    email_address.send_confirmation(request, signup=signup)
    return True
