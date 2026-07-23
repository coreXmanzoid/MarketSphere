from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from .models import Address, Seller
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

from django.db import transaction
from django.utils.text import slugify


@transaction.atomic
def create_seller_application(user, data, files):
    # --------------------------------------------------
    # Update user contact number (if your User model has it)
    # --------------------------------------------------
    if hasattr(user, "contact"):
        user.contact = data.get("phone", "").strip()
        user.save(update_fields=["contact"])

    # --------------------------------------------------
    # Create or Update Business Address
    # --------------------------------------------------
    Address.objects.update_or_create(
        user=user,
        address_type=Address.BUSINESS,
        defaults={
            "full_name": data.get("fullName"),
            "phone": data.get("phone"),
            "address_line_1": data.get("address_line_1"),
            "address_line_2": data.get("address_line_2", ""),
            "city": data.get("city"),
            "postal_code": data.get("postal_code"),
        },
    )

    # --------------------------------------------------
    # Create unique slug
    # --------------------------------------------------
    base_slug = slugify(data.get("store_name"))
    slug = base_slug
    counter = 1

    while Seller.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # --------------------------------------------------
    # Create Seller
    # --------------------------------------------------
    if hasattr(user, "seller_profile"):
        raise ValueError("Seller profile already exists.")
    
    seller = Seller.objects.create(
        user=user,
        store_name=data.get("store_name"),
        slug=slug,
        store_email=data.get("store_email"),
        store_description=data.get("description"),
        store_logo=files.get("store_logo"),
        store_banner=files.get("store_banner"),
    )

    return seller

def update_seller_information(user, data, files):
    seller = user.seller_profile

    # Update store name and slug if changed
    store_name = (data.get("store_name") or "").strip()
    if store_name and store_name != seller.store_name:
        base_slug = slugify(store_name)
        slug = base_slug
        counter = 1
        while Seller.objects.filter(slug=slug).exclude(pk=seller.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        seller.store_name = store_name
        seller.slug = slug

    # Update other simple fields
    store_email = data.get("store_email")
    if store_email is not None:
        seller.store_email = store_email

    store_description = data.get("store_description")
    if store_description is not None:
        seller.store_description = store_description

    # Update files if provided
    store_logo = files.get("store_logo")
    if store_logo:
        seller.store_logo = store_logo

    store_banner = files.get("store_banner")
    if store_banner:
        seller.store_banner = store_banner

    seller.save()
    return seller

from .models import SellerSettings
def update_shipping_preferences(seller, data):
    settings, created = SellerSettings.objects.get_or_create(
        seller=seller
    )

    settings.default_courier = data.get("default_courier", "")
    settings.default_handling_time = int(
        data.get(
            "handling_time",
            SellerSettings.HandlingTime.TWO_DAYS,
        )
    )
    settings.return_address = data.get("return_address", "").strip()
    settings.shipping_notes = data.get("shipping_notes", "").strip()
    settings.auto_mark_shipped = (
        str(data.get("auto_mark_shipped")).lower() == "true"
    )

    settings.save()

    return settings


def update_notification_preferences(seller, data):
    settings, _ = SellerSettings.objects.get_or_create(seller=seller)

    settings.email_new_order = (
        str(data.get("email_new_order")).lower() == "true"
    )

    settings.email_cancelled_order = (
        str(data.get("email_cancelled_order")).lower() == "true"
    )

    settings.email_delivered_order = (
        str(data.get("email_delivered_order")).lower() == "true"
    )

    settings.email_low_stock = (
        str(data.get("email_low_stock")).lower() == "true"
    )

    settings.weekly_sales_summary = (
        str(data.get("weekly_sales_summary")).lower() == "true"
    )

    settings.monthly_store_report = (
        str(data.get("monthly_store_report")).lower() == "true"
    )

    settings.save()

    return settings


def deactivate_seller_account(seller):
    seller.status = Seller.Status.DEACTIVATED
    seller.save(update_fields=["status"])

def reactivate_seller_account(seller):
    seller.status = Seller.Status.VERIFIED
    seller.save(update_fields=["status"])


def update_seller_address(user, data):
    seller = user.seller_profile
    seller_address = get_bussiness_address(seller)

    if seller_address is None:
        raise ValueError("Business address not found.")

    seller_address.full_name = data.get("fullName", "").strip()
    seller_address.phone = data.get("phone", "").strip()
    seller_address.address_line_1 = data.get("address", "").strip()
    seller_address.city = data.get("city", "").strip()
    seller_address.postal_code = data.get("postalCode", "").strip()

    seller_address.save()

    return seller_address

def get_bussiness_address(seller):
    business_address = seller.user.addresses.filter(
        address_type=Address.BUSINESS
    ).first()
    return business_address