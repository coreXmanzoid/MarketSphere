from datetime import timedelta

from django.db.models import F, Sum
from django.utils import timezone

from accounts.models import Seller
from orders.models import Order, SellerOrder
from products.models import Product

from orders.services import get_seller_orders

today = timezone.now()
week_ago = today - timedelta(days=7)


def seller_dashboard(request):
    if not request.user.is_authenticated:
        return {}

    try:
        seller = request.user.seller_profile
    except Seller.DoesNotExist:
        return {}

    seller_products = Product.objects.filter(seller=seller)
    seller_orders = SellerOrder.objects.filter(seller=seller)

    total_products = seller_products.count()

    drafted_products = seller_products.filter(
        status=Product.Status.DRAFT
    )

    pending_orders = seller_orders.filter(
        status=SellerOrder.Status.PENDING
    ).count()

    processing_orders = seller_orders.filter(
        status=SellerOrder.Status.PROCESSING
    ).count()

    completed_orders = seller_orders.filter(
        status=SellerOrder.Status.DELIVERED
    ).count()

    completed_revenue = (
        seller_orders.filter(
            status=SellerOrder.Status.DELIVERED,
            order__payment_status=Order.PaymentStatus.PAID,
        ).aggregate(
            revenue=Sum("total")
        )["revenue"]
        or 0
    )

    new_orders_this_week = seller_orders.filter(
        created_at__gte=week_ago
    ).count()

    month_orders = seller_orders.filter(
        created_at__year=today.year,
        created_at__month=today.month,
    ).count()

    recent_orders = (
        seller_orders.select_related("order", "order__user")
        .prefetch_related("items", "items__product")
        .order_by("-created_at")[:4]
    )

    low_stock_products = seller_products.filter(
        stock_quantity__lte=F("min_stock_level")
    )

    out_of_stock_products = seller_products.filter(
        stock_quantity__lte=0
    )

    return {
        "dashboard_seller": seller,
        "dashboard_pending_orders": pending_orders,
        "dashboard_completed_orders": completed_orders,
        "dashboard_processing_orders": processing_orders,
        "dashboard_total_products": total_products,
        "dashboard_seller_products": seller_products,
        "dashboard_low_stock_products": low_stock_products,
        "dashboard_out_of_stock_products": out_of_stock_products,
        "dashboard_completed_revenue": completed_revenue,
        "dashboard_month_orders": month_orders,
        "dashboard_new_orders_this_week": new_orders_this_week,
        "dashboard_recent_orders": recent_orders,
        "dashboard_drafted_products": drafted_products,
        "dashboard_seller_orders": get_seller_orders(request.user.seller_profile)
    }