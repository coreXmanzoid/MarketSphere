from collections import defaultdict
from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.db.models import Prefetch, Sum
from django.shortcuts import get_object_or_404

from accounts.models import Address
from products.models import CartItem, Product
from products.services import get_or_create_cart

from .models import Order, OrderItem, SellerOrder

CANCELABLE_SELLER_ORDER_STATUSES = (
    SellerOrder.Status.PENDING,
    SellerOrder.Status.CONFIRMED,
    SellerOrder.Status.PROCESSING,
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

    full_name = (
        full_name or f"{user.first_name} {user.last_name}".strip() or user.username
    )

    email = email or user.email

    phone = phone or address.phone or user.contact

    # --------------------------------------------------
    # Group cart items by seller — each seller gets its
    # own SellerOrder under the parent Order.
    # --------------------------------------------------
    items_by_seller = defaultdict(list)
    for item in cart_items:
        if item.product.seller_id is None:
            raise ValueError(
                f"'{item.product.name}' has no seller assigned and cannot be ordered."
            )
        items_by_seller[item.product.seller_id].append(item)

    order = Order.objects.create(
        user=user,
        order_number=uuid4().hex[:12].upper(),
        shipping_name=full_name,
        shipping_phone=phone,
        shipping_address=address.address_line_1,
        shipping_city=address.city,
        shipping_postal_code=address.postal_code,
        notes=notes,
    )

    order_subtotal = Decimal("0.00")

    for seller_id, items in items_by_seller.items():
        seller_subtotal = Decimal("0.00")
        pending_order_items = []

        for item in items:
            product = item.product
            price = product.discount_price or product.price

            if product.stock_quantity < item.quantity:
                raise ValueError(
                    f"Only {product.stock_quantity} units of '{product.name}' are available."
                )

            item_total = price * item.quantity
            seller_subtotal += item_total

            product.stock_quantity -= item.quantity
            product.status = (
                Product.Status.OUT_OF_STOCK
                if product.stock_quantity == 0
                else Product.Status.PUBLISHED
            )
            product.save(update_fields=["stock_quantity", "status"])

            pending_order_items.append(
                (product, price, item.quantity, item_total)
            )

        seller_shipping_cost = Decimal("0.00")
        seller_discount = Decimal("0.00")
        seller_tax = Decimal("0.00")
        seller_total = seller_subtotal + seller_shipping_cost + seller_tax - seller_discount

        seller_order = SellerOrder.objects.create(
            order=order,
            seller_id=seller_id,
            subtotal=seller_subtotal,
            shipping_cost=seller_shipping_cost,
            discount=seller_discount,
            tax=seller_tax,
            total=seller_total,
        )

        OrderItem.objects.bulk_create(
            [
                OrderItem(
                    seller_order=seller_order,
                    product=product,
                    price=price,
                    quantity=quantity,
                    total=item_total,
                )
                for product, price, quantity, item_total in pending_order_items
            ]
        )

        order_subtotal += seller_subtotal

    shipping_cost = Decimal("0.00")
    discount = Decimal("0.00")
    tax = Decimal("0.00")
    total = order_subtotal + shipping_cost + tax - discount

    order.subtotal = order_subtotal
    order.shipping_cost = shipping_cost
    order.discount = discount
    order.tax = tax
    order.total = total
    order.save()

    cart_items.delete()

    return order


def _seller_orders_prefetch():
    return Prefetch(
        "seller_orders",
        queryset=SellerOrder.objects.select_related("seller").prefetch_related(
            Prefetch(
                "items",
                queryset=OrderItem.objects.select_related("product"),
            )
        ),
    )


def get_user_orders(user):
    return (
        Order.objects.filter(user=user)
        .prefetch_related(_seller_orders_prefetch())
        .annotate(total_items=Sum("seller_orders__items__quantity"))
        .order_by("-created_at")
    )


def get_user_order(user, order_number):
    order = get_object_or_404(
        Order.objects.prefetch_related(_seller_orders_prefetch()),
        order_number=order_number,
        user=user,
    )
    return order


def cancel_user_order(user, order_number):
    order = get_user_order(user, order_number)
    seller_orders = list(order.seller_orders.all())

    if not seller_orders:
        return False

    if any(so.status not in CANCELABLE_SELLER_ORDER_STATUSES for so in seller_orders):
        return False

    SellerOrder.objects.filter(order=order).update(status=SellerOrder.Status.CANCELLED)
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
    seller_orders = list(order.seller_orders.all())

    if not seller_orders:
        return None

    if any(so.status != SellerOrder.Status.DELIVERED for so in seller_orders):
        return None

    for seller_order in seller_orders:
        for item in seller_order.items.select_related("product"):
            add_to_cart(
                user=user,
                product=item.product,
                quantity=item.quantity,
            )

    return order


def get_user_order_for_seller(seller, order_number):
    return get_object_or_404(
        SellerOrder.objects.select_related(
            "order",
            "order__user",
            "seller",
        ).prefetch_related(
            "items",
            "items__product",
            "items__product__images",
        ),
        seller=seller,
        order__order_number=order_number,
    )

def get_seller_orders(seller):
    """
    Returns all orders belonging to a specific seller.
    """

    return (
        SellerOrder.objects.filter(seller=seller)
        .select_related(
            "order",
            "order__user",
        )
        .prefetch_related(
            "items",
            "items__product",
        )
        .order_by("-created_at")
    )


def update_order_status(seller, order_number, status):
    return SellerOrder.objects.filter(
        order__order_number=order_number,
        seller=seller,
    ).update(status=status)


from django.utils.dateparse import parse_date


def update_shipping_information(seller_order, data):
    seller_order.courier = data.get("courier", "").strip()
    seller_order.tracking_number = data.get("tracking_number", "").strip()

    eta = data.get("estimated_delivery")

    if eta:
        seller_order.estimated_delivery = parse_date(eta)
    else:
        seller_order.estimated_delivery = None

    seller_order.shipping_notes = data.get("shipping_notes", "").strip()

    seller_order.save(
        update_fields=[
            "courier",
            "tracking_number",
            "estimated_delivery",
            "shipping_notes",
            "updated_at",
        ]
    )

    return seller_order