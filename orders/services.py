from collections import defaultdict
from decimal import Decimal
from uuid import uuid4
from calendar import monthrange
from datetime import datetime

from django.db import transaction
from django.db.models import Prefetch, Sum, Count, F, Q, IntegerField
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date

from accounts.models import Address
from products.models import CartItem, Product
from products.services import get_or_create_cart

from .models import Order, OrderItem

CANCELABLE_ORDER_STATUSES = (
    Order.Status.PENDING,
    Order.Status.CONFIRMED,
    Order.Status.PROCESSING,
)


@transaction.atomic
def place_order(
    user,
    address_id,
    full_name=None,
    email=None,
    phone=None,
    notes="",
):
    cart_items = (
        CartItem.objects.select_related("product", "product__seller", "cart")
        .filter(cart__user=user)
    )

    if not cart_items.exists():
        raise ValueError("Your cart is empty.")

    address = get_object_or_404(
        Address,
        id=address_id,
        user=user,
    )

    full_name = full_name or f"{user.first_name} {user.last_name}".strip() or user.username
    email = email or user.email
    phone = phone or address.phone or user.contact

    # --------------------------------------------------
    # Group cart items by seller — each seller now gets 
    # their own dedicated Order instance.
    # --------------------------------------------------
    items_by_seller = defaultdict(list)
    for item in cart_items:
        if item.product.seller_id is None:
            raise ValueError(
                f"'{item.product.name}' has no seller assigned and cannot be ordered."
            )
        items_by_seller[item.product.seller_id].append(item)

    created_orders = []

    for seller_id, items in items_by_seller.items():
        order_subtotal = Decimal("0.00")
        pending_order_items = []

        order = Order.objects.create(
            user=user,
            seller_id=seller_id,
            order_number=uuid4().hex[:12].upper(),
            shipping_name=full_name,
            shipping_phone=phone,
            shipping_address=address.address_line_1,
            shipping_city=address.city,
            shipping_postal_code=address.postal_code,
            buyer_notes=notes,
        )

        for item in items:
            product = item.product
            price = product.discount_price or product.price

            if product.stock_quantity < item.quantity:
                raise ValueError(
                    f"Only {product.stock_quantity} units of '{product.name}' are available."
                )

            item_total = price * item.quantity
            order_subtotal += item_total

            product.stock_quantity -= item.quantity
            product.status = (
                Product.Status.OUT_OF_STOCK
                if product.stock_quantity == 0
                else Product.Status.PUBLISHED
            )
            product.save(update_fields=["stock_quantity", "status"])

            pending_order_items.append(
                OrderItem(
                    order=order,
                    product=product,
                    price=price,
                    quantity=item.quantity,
                    total=item_total,
                )
            )

        OrderItem.objects.bulk_create(pending_order_items)

        shipping_cost = Decimal("0.00")
        discount = Decimal("0.00")
        tax = Decimal("0.00")
        total = order_subtotal + shipping_cost + tax - discount

        order.subtotal = order_subtotal
        order.shipping_cost = shipping_cost
        order.discount = discount
        order.tax = tax
        order.total = total
        order.save(
            update_fields=["subtotal", "shipping_cost", "discount", "tax", "total"]
        )

        created_orders.append(order)

    cart_items.delete()

    return created_orders


def get_user_orders(user):
    return (
        Order.objects.filter(user=user)
        .select_related("seller")
        .prefetch_related("items__product")
        .annotate(total_items=Sum("items__quantity"))
        .order_by("-created_at")
    )


def get_user_order(user, order_number):
    return get_object_or_404(
        Order.objects.select_related("seller").prefetch_related("items__product"),
        order_number=order_number,
        user=user,
    )


def cancel_user_order(user, order_number):
    order = get_user_order(user, order_number)

    if order.status not in CANCELABLE_ORDER_STATUSES:
        return False

    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status"])
    return True


def add_to_cart(user, product, quantity=1):
    cart = get_or_create_cart(user)

    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        defaults={"quantity": quantity},
    )

    if not created:
        cart_item.quantity += quantity
        cart_item.save(update_fields=["quantity", "updated_at"])

    return cart_item


def reorder_user_order(user, order_number):
    order = get_user_order(user, order_number)

    if order.status != Order.Status.DELIVERED:
        return None

    for item in order.items.select_related("product"):
        add_to_cart(
            user=user,
            product=item.product,
            quantity=item.quantity,
        )

    return order


def get_user_order_for_seller(seller, order_number):
    return get_object_or_404(
        Order.objects.select_related(
            "user",
            "seller",
        ).prefetch_related(
            "items",
            "items__product",
            "items__product__images",
        ),
        seller=seller,
        order_number=order_number,
    )


def get_seller_orders(seller):
    """
    Returns all orders belonging to a specific seller.
    """
    return (
        Order.objects.filter(seller=seller)
        .select_related("user")
        .prefetch_related(
            "items",
            "items__product",
        )
        .order_by("-created_at")
    )


def _percentage_change(current, previous):
    if previous == 0:
        if current == 0:
            return 0
        return 100

    return round(((current - previous) / previous) * 100, 1)


def get_admin_order_stats():
    now = timezone.localtime()

    current_month_start = now.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    if current_month_start.month == 1:
        previous_month_start = current_month_start.replace(
            year=current_month_start.year - 1,
            month=12,
        )
    else:
        previous_month_start = current_month_start.replace(
            month=current_month_start.month - 1,
        )

    current_month_end = now

    orders = Order.objects.all()

    current_orders = orders.filter(
        created_at__gte=current_month_start,
        created_at__lte=current_month_end,
    )

    previous_orders = orders.filter(
        created_at__gte=previous_month_start,
        created_at__lt=current_month_start,
    )

    pending_orders = orders.filter(status=Order.Status.PENDING).count()
    processing_orders = orders.filter(status=Order.Status.PROCESSING).count()
    delivered_orders = orders.filter(status=Order.Status.DELIVERED).count()

    current_pending_orders = current_orders.filter(status=Order.Status.PENDING).count()
    previous_pending_orders = previous_orders.filter(status=Order.Status.PENDING).count()

    current_processing_orders = current_orders.filter(status=Order.Status.PROCESSING).count()
    previous_processing_orders = previous_orders.filter(status=Order.Status.PROCESSING).count()

    current_delivered_orders = current_orders.filter(status=Order.Status.DELIVERED).count()
    previous_delivered_orders = previous_orders.filter(status=Order.Status.DELIVERED).count()

    total_revenue = orders.filter(
        status=Order.Status.DELIVERED
    ).aggregate(
        total=Sum("total")
    )["total"] or Decimal("0.00")

    current_revenue = current_orders.filter(
        status=Order.Status.DELIVERED
    ).aggregate(
        total=Sum("total")
    )["total"] or Decimal("0.00")

    previous_revenue = previous_orders.filter(
        status=Order.Status.DELIVERED
    ).aggregate(
        total=Sum("total")
    )["total"] or Decimal("0.00")

    pending_change = _percentage_change(current_pending_orders, previous_pending_orders)
    processing_change = _percentage_change(current_processing_orders, previous_processing_orders)
    delivered_change = _percentage_change(current_delivered_orders, previous_delivered_orders)
    revenue_change = _percentage_change(current_revenue, previous_revenue)

    return {
        "pending_orders": pending_orders,
        "pending_orders_change": abs(pending_change),
        "pending_orders_increased": pending_change >= 0,

        "processing_orders": processing_orders,
        "processing_orders_change": abs(processing_change),
        "processing_orders_increased": processing_change >= 0,

        "delivered_orders": delivered_orders,
        "delivered_orders_change": abs(delivered_change),
        "delivered_orders_increased": delivered_change >= 0,

        "total_revenue": total_revenue,
        "revenue_change": abs(revenue_change),
        "revenue_increased": revenue_change >= 0,
    }


def get_admin_orders():
    return (
        Order.objects
        .select_related("user", "seller")
        .prefetch_related(
            "items",
            "items__product",
        )
        .order_by("-created_at")
    )


def update_order_status(seller, order_number, status):
    update_fields = {
        "status": status,
    }

    if status == Order.Status.SHIPPED:
        update_fields["shipped_at"] = timezone.now()
    elif status == Order.Status.DELIVERED:
        update_fields["delivered_at"] = timezone.now()

    return Order.objects.filter(
        order_number=order_number,
        seller=seller,
    ).update(**update_fields)


def update_seller_note(seller, order_number, note):
    order = Order.objects.filter(
        order_number=order_number, 
        seller=seller
    ).first()

    if order:
        order.seller_notes = note
        order.save(update_fields=['seller_notes'])
        return True
        
    return False


def update_shipping_information(order, data):
    order.courier = data.get("courier", "").strip()
    order.tracking_number = data.get("tracking_number", "").strip()

    eta = data.get("estimated_delivery")
    if eta:
        order.estimated_delivery = parse_date(eta)
    else:
        order.estimated_delivery = None

    order.shipping_notes = data.get("shipping_notes", "").strip()

    order.save(
        update_fields=[
            "courier",
            "tracking_number",
            "estimated_delivery",
            "shipping_notes",
            "updated_at",
        ]
    )

    return order