from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from .models import Address
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



from django.shortcuts import get_object_or_404

from .models import Address


def save_user_address(user, address_data):
    address_id = address_data.get("addressId")
    if address_id == "null":
        address = Address(
            user=user,
        )
    else:
        address = get_object_or_404(
            Address,
            id=address_id,
            user=user,
        )

    address.address_type = address_data["label"]
    address.full_name = address_data["fullName"]
    address.phone = address_data["phoneNumber"]
    address.address_line_1 = address_data["address"]
    address.city = address_data["city"]
    address.postal_code = address_data["ptCode"]
    address.is_default = address_data.get(
        "isDefault",
        address.is_default if address_id else False,
    )

    address.save()

    return address    

def delete_address(user, address_id):
    address = get_object_or_404(
        Address,
        id=address_id,
        user=user,
    )
    address.delete()


def get_user_addresses(user):
    return user.addresses.all()


def get_default_address(user):
    return user.addresses.filter(
        is_default=True,
    ).first()