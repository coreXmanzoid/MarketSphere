
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from .models import (
    Address,
    Seller,
    SellerApplication,
    SellerApplicationDocument,
    SellerSettings,
    SellerProfile,
)
from django.utils import timezone
from . import validator

# User = get_user_model()
from .models import User, SellerProfile


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
        raise ValueError(
            "User must have an email address before verification can be sent."
        )

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


def get_all_buyers():
    return User.objects.all()

from django.utils import timezone

from accounts.models import SellerApplication


def reject_seller_application_service(
    application_id,
    reason,
    notes,
):
    application = SellerApplication.objects.get(pk=application_id)

    application.status = SellerApplication.Status.REJECTED
    application.rejection_reason = reason
    application.admin_notes = notes
    application.reviewed_at = timezone.now()

    application.save(
        update_fields=[
            "status",
            "rejection_reason",
            "admin_notes",
            "reviewed_at",
        ]
    )

    return application

from django.db import transaction
from django.utils import timezone

from accounts.models import Seller, SellerApplication


@transaction.atomic
def request_application_changes_service(
    application_id,
    requested_changes,
    notes,
):

    application = SellerApplication.objects.select_related(
        "seller"
    ).get(pk=application_id)

    seller = application.seller

    message = notes.strip()

    if requested_changes:
        checklist = "\n".join(
            f"• {item}" for item in requested_changes
        )

        if message:
            message = f"{message}\n\nRequested Changes:\n{checklist}"
        else:
            message = f"Requested Changes:\n{checklist}"

    application.status = SellerApplication.Status.CHANGES_REQUESTED
    application.admin_notes = message
    application.reviewed_at = timezone.now()

    application.save(
        update_fields=[
            "status",
            "admin_notes",
            "reviewed_at",
        ]
    )

    seller.status = Seller.Status.PENDING
    seller.save(update_fields=["status"])
    return application

from django.db import transaction
from django.utils import timezone

from accounts.models import Seller, SellerApplication, User


@transaction.atomic
def approve_seller_application_service(application_id):

    application = SellerApplication.objects.select_related(
        "seller",
        "seller__user",
    ).get(pk=application_id)

    seller = application.seller

    application.status = SellerApplication.Status.APPROVED
    application.reviewed_at = timezone.now()

    application.save(
        update_fields=[
            "status",
            "reviewed_at",
        ]
    )

    seller.status = Seller.Status.VERIFIED
    seller.save(update_fields=["status"])

    return application

from django.db import transaction

from accounts.models import Seller


@transaction.atomic
def delete_seller_account_service(seller_id):

    seller = Seller.objects.get(pk=seller_id)

    seller.delete()




def flag_seller_document_service(
    *,
    document_id,
    issue,
    note,
):

    document = SellerApplicationDocument.objects.get(
        pk=document_id
    )

    document.verified = False

    message = issue

    if note:
        message += f"\n\n{note}"

    document.verification_note = message

    document.save(
        update_fields=[
            "verified",
            "verification_note",
        ]
    )

    return document

from django.shortcuts import get_object_or_404


def verify_seller_document_service(document_id, document_type):
    document = get_object_or_404(
        SellerApplicationDocument,
        id=document_id,
        document_type=document_type,
    )

    document.verified = True
    document.verification_note = ""
    document.save(
        update_fields=[
            "verified",
            "verification_note",
        ]
    )

    return document




def request_missing_document_service(
    application_id,
    document_type,
    reason,
    note,
):
    seller = get_object_or_404(
        Seller,
        id=application_id,
    )

    application = seller.application

    document, created = SellerApplicationDocument.objects.get_or_create(
        application=application,
        document_type=document_type,
    )


    document.verified = False
    document.verification_note = f"{reason}\n\n{note}"

    document.save(
        update_fields=[
            "verified",
            "verification_note",
        ]
    )

    return document

from django.shortcuts import get_object_or_404


def save_application_notes_service(
    application_id,
    notes,
):

    application = get_object_or_404(
        SellerApplication,
        pk=application_id,
    )

    application.admin_notes = notes

    application.save(
        update_fields=[
            "admin_notes",
        ]
    )

    return application

from orders.models import SellerOrder

from django.db.models import Sum, Q, DecimalField, Value
from django.db.models.functions import Coalesce
from decimal import Decimal


def get_all_sellers():
    return Seller.objects.annotate(
        total_sales=Coalesce(
            Sum(
                "orders__total",
                filter=Q(orders__status=SellerOrder.Status.DELIVERED),
            ),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
    )


from django.shortcuts import get_object_or_404


def change_account_state(user_id, state):
    user = get_object_or_404(User, id=user_id)
    user.account_status = state
    user.save(update_fields=["account_status"])


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

from django.db import transaction
from django.utils.text import slugify


def calculate_application_progress(seller):
    completed = 0
    total = 0
    missing = []

    profile = getattr(seller, "profile", None)
    address = seller.business_address
    application = getattr(seller, "application", None)

    documents = {}

    if application:
        documents = {
            document.document_type: document
            for document in application.documents.all()
        }

    def check(condition, label):
        nonlocal completed, total

        total += 1

        if condition:
            completed += 1
        else:
            missing.append(label)

    # ---------------------------------------------------
    # Store Information
    # ---------------------------------------------------

    check(bool(seller.store_name), "Store Name")
    check(bool(seller.store_email), "Store Email")
    check(bool(seller.store_description), "Store Description")
    check(bool(seller.store_logo), "Store Logo")

    # ---------------------------------------------------
    # Business Address
    # ---------------------------------------------------

    check(address and address.full_name, "Business Contact")
    check(address and address.phone, "Business Phone")
    check(address and address.address_line_1, "Business Address")
    check(address and address.city, "City")
    check(address and address.postal_code, "Postal Code")

    # ---------------------------------------------------
    # Seller Profile
    # ---------------------------------------------------

    check(profile and profile.business_category, "Business Category")
    check(profile and profile.business_type, "Business Type")
    check(profile and profile.national_id_number, "National ID Number")

    # ---------------------------------------------------
    # Required Documents
    # ---------------------------------------------------

    check(
        SellerApplicationDocument.DocumentType.CNIC_FRONT in documents,
        "CNIC Front",
    )

    check(
        SellerApplicationDocument.DocumentType.CNIC_BACK in documents,
        "CNIC Back",
    )

    check(
        SellerApplicationDocument.DocumentType.STORE_PHOTO in documents,
        "Store Photo",
    )

    progress = round((completed / total) * 100) if total else 0

    return {
        "progress": progress,
        "completed": completed,
        "total": total,
        "missing": missing,
        "is_complete": progress == 100,
    }


def update_application_progress(seller):
    progress = calculate_application_progress(seller)

    application = seller.application

    if progress["is_complete"]:

        seller.status = Seller.Status.PENDING
        seller.save(update_fields=["status"])

        application.status = SellerApplication.Status.SUBMITTED
        application.save(update_fields=["status"])

    else:

        seller.status = Seller.Status.DRAFT
        seller.save(update_fields=["status"])

        application.status = SellerApplication.Status.DRAFT
        application.save(update_fields=["status"])

    return progress

@transaction.atomic
def create_seller_application(user, data, files):
    # --------------------------------------------------
    # Update user contact
    # --------------------------------------------------
    if hasattr(user, "contact"):
        user.contact = data.get("phone", "").strip()
        user.save(update_fields=["contact"])

    # --------------------------------------------------
    # Create / Update Business Address
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
    # Generate Unique Store Slug
    # --------------------------------------------------
    base_slug = slugify(data.get("store_name"))
    slug = base_slug
    counter = 1

    while Seller.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # --------------------------------------------------
    # Prevent Duplicate Seller
    # --------------------------------------------------
    if hasattr(user, "seller_profile"):
        raise ValueError("Seller profile already exists.")

    # --------------------------------------------------
    # Create Seller
    # --------------------------------------------------
    seller = Seller.objects.create(
        user=user,
        store_name=data.get("store_name"),
        slug=slug,
        store_email=data.get("store_email"),
        store_description=data.get("description"),
        store_logo=files.get("store_logo"),
        store_banner=files.get("store_banner"),
    )

    # --------------------------------------------------
    # Create Seller Application
    # --------------------------------------------------
    application = SellerApplication.objects.create(
        seller=seller,
        status=SellerApplication.Status.DRAFT,
        submitted_at=timezone.now(),
        application_source="Website",
        referral_code=data.get("referral_code", ""),
    )

    # --------------------------------------------------
    # Upload Documents
    # --------------------------------------------------
    document_mapping = {
        SellerApplicationDocument.DocumentType.CNIC_FRONT: "cnic_front",
        SellerApplicationDocument.DocumentType.CNIC_BACK: "cnic_back",
        SellerApplicationDocument.DocumentType.BUSINESS_CERTIFICATE: "business_certificate",
        SellerApplicationDocument.DocumentType.NTN: "ntn_certificate",
        SellerApplicationDocument.DocumentType.BANK_STATEMENT: "bank_statement",
        SellerApplicationDocument.DocumentType.STORE_PHOTO: "store_photo",
    }

    for document_type, input_name in document_mapping.items():
        uploaded_file = files.get(input_name)

        if uploaded_file:
            SellerApplicationDocument.objects.create(
                application=application,
                document_type=document_type,
                file=uploaded_file,
            )

    # --------------------------------------------------
    # Create Seller Settings
    # --------------------------------------------------
    SellerSettings.objects.create(
        seller=seller,
        business_registration_number=data.get(
            "business_registration_number",
            "",
        ),
        tax_id=data.get("tax_id", ""),
    )

    # --------------------------------------------------
    # Create Seller Profile
    # --------------------------------------------------
    SellerProfile.objects.create(
        seller=seller,
        business_category=data.get("business_category", ""),
        business_type=data.get("business_type", ""),
        national_id_number=data.get("national_id_number", ""),
        years_in_business=data.get("years_in_business") or None,
        expected_monthly_volume=data.get(
            "expected_monthly_volume",
            "",
        ),
        product_categories=data.get(
            "product_categories",
            "",
        ),
        website=data.get("website", ""),
        facebook_label=data.get("facebook_label", ""),
        facebook_url=data.get("facebook_url", ""),
        linkedin_label=data.get("linkedin_label", ""),
        linkedin_url=data.get("linkedin_url", ""),
        instagram_label=data.get("instagram_label", ""),
        instagram_url=data.get("instagram_url", ""),
        twitter_label=data.get("twitter_label", ""),
        twitter_url=data.get("twitter_url", ""),
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
    update_application_progress(seller)
    return seller


from accounts.models import Seller, SellerSettings, Address


def update_store_information(seller, data):
    print(data)
    seller.store_name = data.get("store_name", "")
    seller.slug = data.get("slug", "")
    seller.store_email = data.get("store_email", "")
    seller.store_description = data.get("store_description", "")
    seller.business_registration_number = data.get("business_registration_number", "")
    seller.tax_id = data.get("tax_id", "")
    seller.save()

    seller.user.contact = data.get("store_phone", "")
    seller.user.save(update_fields=["contact"])

    profile, _ = SellerProfile.objects.get_or_create(seller=seller)
    profile.business_category = data.get("business_category", "")
    profile.website = data.get("website", "")

    profile.facebook_label = data.get("facebook_label", "")
    profile.facebook_url = data.get("facebook_url", "")

    profile.instagram_label = data.get("instagram_label", "")
    profile.instagram_url = data.get("instagram_url", "")

    profile.linkedin_label = data.get("linkedin_label", "")
    profile.linkedin_url = data.get("linkedin_url", "")

    profile.twitter_label = data.get("twitter_label", "")
    profile.twitter_url = data.get("twitter_url", "")

    profile.save()
    address, _ = Address.objects.get_or_create(
        user=seller.user,
        address_type=Address.BUSINESS,
    )

    address.city = data.get("city", "")
    address.address_line_1 = data.get("address_line_1", "")
    address.postal_code = data.get("postal_code", "")
    address.save()
    update_application_progress(seller)
    return seller


def update_seller_status(seller, status):
    seller.status = status
    seller.save(update_fields=["status"])


def change_store_banner(seller_id, banner):
    seller = Seller.objects.filter(id=seller_id).first()

    if not seller:
        return None

    seller.store_banner = banner
    seller.save(update_fields=["store_banner"])

    return seller.store_banner.url


from .models import SellerSettings


def update_shipping_preferences(seller, data):
    settings, created = SellerSettings.objects.get_or_create(seller=seller)

    settings.default_courier = data.get("default_courier", "")
    settings.default_handling_time = int(
        data.get(
            "handling_time",
            SellerSettings.HandlingTime.TWO_DAYS,
        )
    )
    settings.return_address = data.get("return_address", "").strip()
    settings.shipping_notes = data.get("shipping_notes", "").strip()
    settings.auto_mark_shipped = str(data.get("auto_mark_shipped")).lower() == "true"

    settings.save()

    return settings


def update_notification_preferences(seller, data):
    settings, _ = SellerSettings.objects.get_or_create(seller=seller)

    settings.email_new_order = str(data.get("email_new_order")).lower() == "true"

    settings.email_cancelled_order = (
        str(data.get("email_cancelled_order")).lower() == "true"
    )

    settings.email_delivered_order = (
        str(data.get("email_delivered_order")).lower() == "true"
    )

    settings.email_low_stock = str(data.get("email_low_stock")).lower() == "true"

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
    update_application_progress(seller)
    return seller_address


from django.db import transaction


@transaction.atomic
def update_user_address(user, data):
    address_id = data.get("addressId", "").strip()

    try:
        user_address = Address.objects.get(id=address_id, user=user)
    except Address.DoesNotExist:
        raise ValueError("Address not found.")

    user_address.full_name = data.get("fullName", "").strip()
    user_address.phone = data.get("phone", "").strip()
    user_address.address_line_1 = data.get("address", "").strip()
    user_address.city = data.get("city", "").strip()
    user_address.postal_code = data.get("postalCode", "").strip()
    user_address.address_type = data.get("type", "").strip()

    is_default = data.get("isDefault") == True
    print(is_default)
    if is_default:
        Address.objects.filter(user=user).exclude(id=user_address.id).update(
            is_default=False
        )

    user_address.is_default = is_default
    user_address.save()

    return user_address


@transaction.atomic
def delete_user_address(user, data):
    address_id = data.get("addressId", "").strip()

    try:
        address = Address.objects.get(id=address_id, user=user)
    except Address.DoesNotExist:
        raise ValueError("Address not found.")

    if address.is_default:
        next_address = Address.objects.filter(user=user).exclude(id=address.id).first()

        if next_address:
            next_address.is_default = True
            next_address.save(update_fields=["is_default"])

    address.delete()

    return True


def get_bussiness_address(seller):
    business_address = seller.user.addresses.filter(
        address_type=Address.BUSINESS
    ).first()
    return business_address


def update_buyer_profile(request, buyer_id):

    try:
        buyer = User.objects.get(pk=buyer_id)

    except User.DoesNotExist:

        return False, "Buyer not found.", None

    print("here")
    buyer.first_name = request.POST.get("first_name", "").strip()

    buyer.last_name = request.POST.get("last_name", "").strip()

    buyer.username = request.POST.get("username", "").strip()

    buyer.email = request.POST.get("email", "").strip()

    buyer.contact = request.POST.get("contact", "").strip()

    buyer.account_status = request.POST.get("account_status").strip()

    profile_image = request.FILES.get("profile_image")

    if profile_image:

        buyer.profile_image_url = profile_image
    else:
        buyer.profile_image_url = None

    buyer.save()

    return True, "Buyer profile updated successfully.", buyer


# from .models import SellerProfile


def update_seller_profile_service(user, data):
    try:
        seller = user.seller_profile

    except Exception:
        return False, "Seller account not found."

    profile, _ = SellerProfile.objects.get_or_create(
        seller=seller,
    )

    profile.business_category = data.get("business_category", "", )

    profile.business_type = data.get(
        "business_type",
        "",
    )

    profile.national_id_number = data.get(
        "national_id_number",
        "",
    )

    years = data.get(
        "years_in_business",
        "",
    )

    profile.years_in_business = int(years) if years else None

    profile.expected_monthly_volume = data.get(
        "expected_monthly_volume",
        "",
    )

    profile.product_categories = data.get(
        "product_categories",
        "",
    )

    profile.website = data.get(
        "website",
        "",
    )

    profile.facebook_label = data.get(
        "facebook_label",
        "",
    )

    profile.facebook_url = data.get(
        "facebook_url",
        "",
    )

    profile.linkedin_label = data.get(
        "linkedin_label",
        "",
    )

    profile.linkedin_url = data.get(
        "linkedin_url",
        "",
    )

    profile.instagram_label = data.get(
        "instagram_label",
        "",
    )

    profile.instagram_url = data.get(
        "instagram_url",
        "",
    )

    profile.twitter_label = data.get(
        "twitter_label",
        "",
    )

    profile.twitter_url = data.get(
        "twitter_url",
        "",
    )

    profile.save()
    update_application_progress(seller)

    return True, "Seller profile updated successfully."

from .models import (
    SellerApplication,
    SellerApplicationDocument,
)


def update_seller_document_service(user, data, files):
    try:
        seller = user.seller_profile
    except Exception:
        return False, "Seller account not found.", None

    try:
        application = SellerApplication.objects.get(
            seller=seller,
        )
    except SellerApplication.DoesNotExist:
        return False, "Seller application not found.", None

    document_type = data.get("document_type")
    uploaded_file = files.get("document")

    if not document_type:
        return False, "Document type is required.", None

    if not uploaded_file:
        return False, "Please select a document.", None

    valid_document_types = {
        choice[0]
        for choice in SellerApplicationDocument.DocumentType.choices
    }

    if document_type not in valid_document_types:
        return False, "Invalid document type.", None
    
    document, created = SellerApplicationDocument.objects.get_or_create(
        application=application,
        document_type=document_type,
    )

    if document.file:
        document.file.delete(save=False)

    document.file = uploaded_file
    document.verified = False
    document.verification_note = ""
    document.save()
    update_application_progress(seller)

    return True, "Document uploaded successfully.", document


from .models import SellerApplicationDocument


def get_seller_application_documents(seller):
    try:
        application = seller.application
    except AttributeError:
        return {}

    uploaded_documents = {
        document.document_type: document
        for document in application.documents.all()
    }

    return {
        "cnic_front": uploaded_documents.get(
            SellerApplicationDocument.DocumentType.CNIC_FRONT
        ),
        "cnic_back": uploaded_documents.get(
            SellerApplicationDocument.DocumentType.CNIC_BACK
        ),
        "business_certificate": uploaded_documents.get(
            SellerApplicationDocument.DocumentType.BUSINESS_CERTIFICATE
        ),
        "ntn": uploaded_documents.get(
            SellerApplicationDocument.DocumentType.NTN
        ),
        "bank_statement": uploaded_documents.get(
            SellerApplicationDocument.DocumentType.BANK_STATEMENT
        ),
        "store_photo": uploaded_documents.get(
            SellerApplicationDocument.DocumentType.STORE_PHOTO
        ),
    }