import json
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone

from .models import Promotion, PromotionProduct


def get_available_promotions_for_seller(seller):
    now = timezone.now()

    return (
        Promotion.objects
        .filter(
            status=Promotion.Status.ACTIVE,
            end_at__gte=now,
        )
        .order_by("start_at", "-homepage_priority", "name")
    )

def sync_product_promotions(seller, product, promotion_data):
    """Synchronize a seller product's selected promotion relationships."""
    if product.seller_id != seller.id:
        raise ValueError("You cannot add promotions to this product.")

    if isinstance(promotion_data, str):
        try:
            promotion_data = json.loads(promotion_data or "[]")
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid promotion data.") from exc

    if promotion_data is None:
        promotion_data = []
    if not isinstance(promotion_data, list):
        raise ValueError("Invalid promotion data.")

    now = timezone.now()
    selected = {}
    for item in promotion_data:
        if not isinstance(item, dict) or not item.get("id"):
            raise ValueError("A selected promotion is invalid.")

        try:
            promotion_id = int(item["id"])
        except (TypeError, ValueError) as exc:
            raise ValueError("A selected promotion is invalid.") from exc

        if promotion_id in selected:
            raise ValueError("A promotion cannot be selected more than once.")

        try:
            price = Decimal(str(item.get("price", "")).strip())
        except (InvalidOperation, ValueError):
            raise ValueError("Promotion price must be greater than zero.")

        if price <= 0:
            raise ValueError("Promotion price must be greater than zero.")
        selected[promotion_id] = price

    promotions = {
        promotion.id: promotion
        for promotion in Promotion.objects.filter(id__in=selected)
    }
    if len(promotions) != len(selected):
        raise ValueError("Promotion does not exist.")

    if product.price is None or product.price <= 0:
        raise ValueError("A valid product price is required for promotions.")

    for promotion_id, promotion_price in selected.items():
        promotion = promotions[promotion_id]
        if promotion.status != Promotion.Status.ACTIVE or promotion.end_at < now:
            raise ValueError(f"Promotion '{promotion.name}' is no longer available.")
        if promotion_price >= product.price:
            raise ValueError(
                f"Promotion price must be lower than the product price for {promotion.name}."
            )

        discount_percentage = (
            (product.price - promotion_price) / product.price
        ) * Decimal("100")
        if (
            promotion.maximum_discount_percentage is not None
            and discount_percentage > Decimal(promotion.maximum_discount_percentage)
        ):
            raise ValueError(
                f"The selected promotion allows a maximum discount of "
                f"{promotion.maximum_discount_percentage}%."
            )

    with transaction.atomic():
        PromotionProduct.objects.filter(product=product).exclude(
            promotion_id__in=selected
        ).delete()
        for promotion_id, promotion_price in selected.items():
            PromotionProduct.objects.update_or_create(
                product=product,
                promotion_id=promotion_id,
                defaults={"promotion_price": promotion_price},
            )

def get_current_homepage_promotion():
    now = timezone.now()

    return (
        Promotion.objects
        .filter(
            status=Promotion.Status.ACTIVE,
            display_on_homepage=True,
            start_at__lte=now,
            end_at__gt=now,
        )
        .order_by("-homepage_priority", "-start_at")
        .first()
    )
