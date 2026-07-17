from accounts.models import Seller
from orders.models import Order, OrderItem
from products.models import Product
from django.db.models import F
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

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

    seller_order_items = OrderItem.objects.filter(product__seller=seller)

    pending_orders = (
        seller_order_items.filter(order__status=Order.Status.PENDING)
        .values("order")
        .distinct()
        .count()
    )

    completed_orders = (
        OrderItem.objects.filter(
            product__seller=seller,
            order__status=Order.Status.DELIVERED,
        )
        .values("order")
        .distinct()
        .count()
    )

    drafted_products = Product.objects.filter(
        seller=seller,
        status=Product.Status.DRAFT,
    )

    completed_revenue = (
        OrderItem.objects.filter(
            product__seller=seller,
            order__status=Order.Status.DELIVERED,
            order__payment_status=Order.PaymentStatus.PAID,
        ).aggregate(revenue=Sum("total"))["revenue"]
        or 0
    )

    pending_orders = (
        seller_order_items.filter(order__status=Order.Status.DELIVERED)
        .values("order")
        .distinct()
        .count()
    )

    processing_orders = (
        seller_order_items.filter(order__status=Order.Status.PROCESSING)
        .values("order")
        .distinct()
        .count()
    )

    new_orders_this_week = (
        OrderItem.objects.filter(
            product__seller=seller,
            order__created_at__gte=week_ago,
        )
        .values("order")
        .distinct()
        .count()
    )

    month_orders = (
        OrderItem.objects.filter(
            product__seller=seller,
            order__created_at__year=today.year,
            order__created_at__month=today.month,
        )
        .values("order")
        .distinct()
        .count()
    )

    recent_orders = (
        Order.objects.filter(items__product__seller=seller)
        .distinct()
        .select_related("user")
        .order_by("-created_at")[:4]
    )

    total_products = seller_products.count()

    low_stock_products = seller_products.filter(
        stock_quantity__lte=F("min_stock_level")
    )

    out_of_stock_products = seller_products.filter(stock_quantity__lte=0)

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
    }
