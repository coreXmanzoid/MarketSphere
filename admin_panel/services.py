from decimal import Decimal

from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from accounts.models import Address, User
from orders.models import Order, SellerOrder, OrderItem
from products import services



def get_buyer_details(user_id):
    buyer = get_object_or_404(User, id=user_id)
    addresses = Address.objects.filter(user=buyer)

    total_orders = buyer.orders.count()

    today = timezone.now()
    current_month_start = today.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    orders_this_month = buyer.orders.filter(
        created_at__gte=current_month_start,
    ).count()

    orders = buyer.orders.prefetch_related("seller_orders")

    completed_orders = sum(
        1
        for order in orders
        if order.overall_status == SellerOrder.Status.DELIVERED
    )

    pending_orders = sum(
        1
        for order in orders
        if order.overall_status
        not in (
            SellerOrder.Status.DELIVERED,
            SellerOrder.Status.CANCELLED,
        )
    )

    cancelled_orders = sum(
        1
        for order in orders
        if order.overall_status == SellerOrder.Status.CANCELLED
    )

    completion_percentage = (
        round((completed_orders / total_orders) * 100)
        if total_orders
        else 0
    )

    cancelled_percentage = (
        round((cancelled_orders / total_orders) * 100)
        if total_orders
        else 0
    )

    paid_orders = buyer.orders.filter(
        payment_status=Order.PaymentStatus.PAID
    )

    total_spent = (
        paid_orders.aggregate(total=Sum("total"))["total"]
        or Decimal("0.00")
    )

    total_paid_orders = paid_orders.count()

    average_order_value = (
        total_spent / total_paid_orders
        if total_paid_orders
        else Decimal("0.00")
    )

    wishlist_items = buyer.wishlist_items.count()

    preferred_category = (
    OrderItem.objects.filter(seller_order__order__user=buyer)
    .values("product__category__name")
    .annotate(total_items=Sum("quantity"))
    .order_by("-total_items")
    .first()
)
    preferred_seller = (
    SellerOrder.objects.filter(order__user=buyer)
    .values("seller__store_name")
    .annotate(total_orders=Sum("items__quantity"))
    .order_by("-total_orders")
    .first()
)
    last_order = buyer.orders.order_by("-created_at").first()

    months = max(
    1,
    (
        (timezone.now().year - buyer.date_joined.year) * 12
        + timezone.now().month
        - buyer.date_joined.month
    ),
)

    order_frequency = round(total_orders / months, 1)

    from datetime import timedelta
    from django.db.models.functions import TruncMonth

    # Last 12 months
    chart_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=365)

    monthly_spending = (
        buyer.orders.filter(
            payment_status=Order.PaymentStatus.PAID,
            created_at__gte=chart_start,
        )
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(total=Sum("total"))
        .order_by("month")
    )

    monthly_map = {
        item["month"].strftime("%b"): float(item["total"])
        for item in monthly_spending
    }

    months = []
    bars = []

    current = chart_start.replace(day=1)

    for _ in range(12):
        label = current.strftime("%b")
        months.append(label)
        bars.append({
            "month": label,
            "total": monthly_map.get(label, 0),
            "height": 0,
        })

        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    max_total = max((bar["total"] for bar in bars), default=1)

    for bar in bars:
        bar["height"] = (
            round((bar["total"] / max_total) * 100)
            if max_total > 0
            else 0
        )

    
    recent_orders = (
        buyer.orders
        .prefetch_related(
            "seller_orders__seller",
            "seller_orders__items__product",
        )
        .order_by("-created_at")[:10]
    )

    for order in recent_orders:
        seller_orders = list(order.seller_orders.all())

        seller_names = [so.seller.store_name for so in seller_orders]

        if len(seller_names) == 1:
            order.seller_name = seller_names[0]
        else:
            order.seller_name = "Multiple Sellers"

        order.items_count = sum(
            item.quantity
            for so in seller_orders
            for item in so.items.all()
        )
    
    return {
        "buyer": buyer,
        "addresses": addresses,
        "total_orders": total_orders,
        "orders_this_month": orders_this_month,
        "completed_orders": completed_orders,
        "completion_percentage": completion_percentage,
        "pending_orders": pending_orders,
        "cancelled_orders": cancelled_orders,
        "cancelled_percentage": cancelled_percentage,
        "total_spent": total_spent,
        "average_order_value": average_order_value,
        "wishlist_items": wishlist_items,
        "preferred_category": preferred_category,
        "preferred_seller": preferred_seller,
        "last_order": last_order,
        "order_frequency": order_frequency,
        "spending_trend": bars,
        "recent_orders": recent_orders,
        "wishlist": services.get_user_wishlist(buyer)
    }







from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_admin_email(
    *,
    user,
    subject,
    message,
    button_text=None,
    button_url=None,
    attachments=None,
):
    """
    Sends a branded MarketSphere email to a user.
    """

    context = {
        "user": user,
        "message": message,
        "button_text": button_text,
        "button_url": button_url,
    }

    html_body = render_to_string(
        "email_components/send_email.html",
        context,
    )

    text_body = render_to_string(
        "email_components/send_email.txt",
        context,
    )

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )

    email.attach_alternative(html_body, "text/html")

    if attachments:
        for uploaded_file in attachments:
            email.attach(
                uploaded_file.name,
                uploaded_file.read(),
                uploaded_file.content_type,
            )

    email.send(fail_silently=False)





import csv

from django.http import HttpResponse
from django.utils import timezone



def export_order_history(user_id):
    orders = (
        Order.objects.filter(user_id=user_id)
        .prefetch_related(
            "seller_orders__seller",
            "seller_orders__items__product",
        )
        .order_by("-created_at")
    )

    response = HttpResponse(content_type="text/csv")

    filename = (
        f"order-history-user-{user_id}-"
        f"{timezone.now().strftime('%Y-%m-%d')}.csv"
    )

    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)

    writer.writerow(
        [
            "Order Number",
            "Order Date",
            "Overall Status",
            "Payment Status",
            "Seller",
            "Products",
            "Subtotal",
            "Shipping",
            "Discount",
            "Tax",
            "Total",
            "Tracking Number",
            "Courier",
        ]
    )

    for order in orders:
        for seller_order in order.seller_orders.all():

            products = ", ".join(
                [
                    f"{item.product.name} (x{item.quantity})"
                    for item in seller_order.items.all()
                ]
            )

            writer.writerow(
                [
                    order.order_number,
                    order.created_at.strftime("%Y-%m-%d %H:%M"),
                    order.get_overall_status_display(),
                    order.get_payment_status_display(),
                    seller_order.seller.store_name,
                    products,
                    seller_order.subtotal,
                    seller_order.shipping_cost,
                    seller_order.discount,
                    seller_order.tax,
                    seller_order.total,
                    seller_order.tracking_number,
                    seller_order.courier,
                ]
            )

    return response