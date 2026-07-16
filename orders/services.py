from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.shortcuts import get_object_or_404
from accounts.models import Address
from products.services import get_or_create_cart
from products.models import CartItem, Product
from django.db.models import Sum
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
        if item.product.stock_quantity < item.quantity:
            raise ValueError(
                f"Only {item.product.stock_quantity} units of '{item.product.name}' are available."
            )
        item.product.stock_quantity -= item.quantity

        if item.product.stock_quantity == 0:
            item.product.status = Product.Status.OUT_OF_STOCK
        else:
            item.product.status = Product.Status.PUBLISHED

        item.product.save(update_fields=["stock_quantity", "status"])

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


def get_user_orders(user):
    return (
        Order.objects.filter(user=user)
        .prefetch_related("items", "items__product")
        .annotate(total_items=Sum("items__quantity"))
        .order_by("-created_at")
    )


def get_user_order(user, order_number):
    order = get_object_or_404(
        Order,
        order_number=order_number,
        user=user,
    )
    return order


def cancel_user_order(user, order_number):
    order = get_user_order(user, order_number)
    # Check if order exists AND is in a cancelable state
    if not order or order.status not in [
        Order.Status.PENDING,
        Order.Status.CONFIRMED,
        Order.Status.PROCESSING,
    ]:
        return False

    order.status = order.Status.CANCELLED
    order.save()
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

    if order.status != order.Status.DELIVERED:
        return None
    for item in order.items.select_related("product"):
        add_to_cart(
            user=user,
            product=item.product,
            quantity=item.quantity,
        )

    return order
