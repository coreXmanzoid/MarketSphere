from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.shortcuts import get_object_or_404

from accounts.models import Address
from products.models import CartItem

from .models import Order, OrderItem


@transaction.atomic
def place_order(
    user,
    address_id,
    full_name=None,
    email=None,
    phone=None,
    notes="",
):
    cart_items = CartItem.objects.select_related("product", "cart").filter(
        cart__user=user
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

    subtotal = Decimal("0.00")

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

    order_items = []

    for item in cart_items:

        price = item.product.discount_price or item.product.price

        item_total = price * item.quantity

        subtotal += item_total

        order_items.append(
            OrderItem(
                order=order,
                product=item.product,
                # Uncomment if your Product model has a seller field
                # seller=item.product.seller,
                price=price,
                quantity=item.quantity,
                total=item_total,
            )
        )

    OrderItem.objects.bulk_create(order_items)

    shipping_cost = Decimal("0.00")
    discount = Decimal("0.00")
    tax = Decimal("0.00")

    total = subtotal + shipping_cost + tax - discount

    order.subtotal = subtotal
    order.shipping_cost = shipping_cost
    order.discount = discount
    order.tax = tax
    order.total = total

    order.save()

    cart_items.delete()

    return order

def get_user_order(user, order_number):
    order = get_object_or_404(
        Order,
        order_number=order_number,
        user=user,
    )
    return order