
from django.core.exceptions import ValidationError
from django.db import transaction

from orders.models import Order

from .models import SupportMessage, SupportRequest


@transaction.atomic
def create_support_request(
    *,
    user,
    request_type,
    category,
    subject,
    message,
    related_order=None,
    related_product_name="",
    attachment=None,
    preferred_contact_method=SupportRequest.ContactMethod.EMAIL,
):

    valid_request_types = dict(
        SupportRequest.RequestType.choices
    )

    valid_categories = dict(
        SupportRequest.Category.choices
    )

    valid_contact_methods = dict(
        SupportRequest.ContactMethod.choices
    )

    if request_type not in valid_request_types:
        raise ValidationError(
            "Invalid support request type."
        )

    if category not in valid_categories:
        raise ValidationError(
            "Invalid support request category."
        )

    if preferred_contact_method not in valid_contact_methods:
        raise ValidationError(
            "Invalid contact method."
        )

    if not subject.strip():
        raise ValidationError(
            "Subject is required."
        )

    if not message.strip():
        raise ValidationError(
            "Message is required."
        )

    if len(message.strip()) > SupportRequest._meta.get_field("message").max_length:
        raise ValidationError(
            f"Message cannot exceed {SupportRequest._meta.get_field('message').max_length} characters."
        )

    if related_order:

        if not Order.objects.filter(
            pk=related_order.pk,
            user=user,
        ).exists():

            raise ValidationError(
                "The selected order does not belong "
                "to your account."
            )

    support_request = SupportRequest.objects.create(
        user=user,
        request_type=request_type,
        category=category,
        subject=subject.strip(),
        message=message.strip(),
        related_order=related_order,
        related_product_name=related_product_name.strip(),
        attachment=attachment,
        preferred_contact_method=preferred_contact_method,
        status=SupportRequest.Status.OPEN,
    )

    SupportMessage.objects.create(
        request=support_request,
        sender=user,
        sender_type=SupportMessage.SenderType.CUSTOMER,
        message=message.strip(),
        attachment=attachment,
    )

    return support_request



def get_user_support_requests(user):
    return (
        SupportRequest.objects
        .filter(user=user)
        .select_related("related_order")
        .prefetch_related("messages")
        .order_by("-updated_at")
    )


def get_user_support_request(*, user, request_id):
    return (
        SupportRequest.objects
        .filter(
            pk=request_id,
            user=user,
        )
        .select_related("related_order")
        .prefetch_related(
            "messages__sender"
        )
        .first()
    )


@transaction.atomic
def add_support_message(
    *,
    support_request,
    sender,
    sender_type,
    message,
    attachment=None,
):
    if not message.strip():
        raise ValidationError("Message cannot be empty.")

    support_message = SupportMessage.objects.create(
        request=support_request,
        sender=sender,
        sender_type=sender_type,
        message=message.strip(),
        attachment=attachment,
    )

    if sender_type == SupportMessage.SenderType.CUSTOMER:
        support_request.status = SupportRequest.Status.IN_PROGRESS
    else:
        support_request.status = SupportRequest.Status.WAITING_FOR_USER

    support_request.save(
        update_fields=[
            "status",
            "updated_at",
        ]
    )

    return support_message
