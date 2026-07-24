from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from orders.models import Order
from products.models import Product, Category
from accounts.models import Seller, User


def admin_context(request):
    today = timezone.now()

    current_month_start = today.replace(
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

    current_month_revenue = Order.objects.filter(
        payment_status=Order.PaymentStatus.PAID,
        created_at__gte=current_month_start,
    ).aggregate(total=Sum("total"))["total"] or Decimal("0.00")
    Total_revenue = Order.objects.filter(
        payment_status=Order.PaymentStatus.PAID
    ).aggregate(total=Sum("total"))["total"] or Decimal("0.00")

    previous_month_revenue = Order.objects.filter(
        payment_status=Order.PaymentStatus.PAID,
        created_at__gte=previous_month_start,
        created_at__lt=current_month_start,
    ).aggregate(total=Sum("total"))["total"] or Decimal("0.00")

    if previous_month_revenue > 0:
        percentage_change = (
            (current_month_revenue - previous_month_revenue) / previous_month_revenue
        ) * 100
    else:
        percentage_change = (
            Decimal("100.00") if current_month_revenue > 0 else Decimal("0.00")
        )
    ###########################################

    current_month_orders = Order.objects.filter(
        created_at__gte=current_month_start
    ).count()

    previous_month_orders = Order.objects.filter(
        created_at__gte=previous_month_start,
        created_at__lt=current_month_start,
    ).count()

    if previous_month_orders > 0:
        orders_change = (
            (current_month_orders - previous_month_orders) / previous_month_orders
        ) * 100
    else:
        orders_change = 100 if current_month_orders > 0 else 0

    ########################################
    from django.db.models import Q

    total_products = Product.objects.exclude(
        status__in=[Product.Status.PENDING, Product.Status.DRAFT]
    ).count()

    current_month_products = Product.objects.filter(
        created_at__gte=current_month_start,
    ).count()

    previous_month_products = Product.objects.filter(
        created_at__gte=previous_month_start,
        created_at__lt=current_month_start,
    ).count()

    if previous_month_products > 0:
        products_change = (
            (current_month_products - previous_month_products) / previous_month_products
        ) * 100
    else:
        products_change = 100 if current_month_products > 0 else 0

    ############################################
    total_sellers = Seller.objects.all().count()

    current_month_sellers = Seller.objects.filter(
        created_at__gte=current_month_start,
    ).count()

    previous_month_sellers = Seller.objects.filter(
        created_at__gte=previous_month_start,
        created_at__lt=current_month_start,
    ).count()

    if previous_month_sellers > 0:
        sellers_change = (
            (current_month_sellers - previous_month_sellers) / previous_month_sellers
        ) * 100
    else:
        sellers_change = 100 if current_month_sellers > 0 else 0

    ############################################
    total_buyers = User.objects.exclude(
        account_status=User.AccountStatus.BLOCKED
    ).count()

    current_month_buyers = (
        User.objects.filter(
            date_joined__gte=current_month_start,
        )
        .exclude(account_status=User.AccountStatus.BLOCKED)
        .count()
    )

    previous_month_buyers = (
        User.objects.filter(
            date_joined__gte=previous_month_start,
            date_joined__lt=current_month_start,
        )
        .exclude(account_status=User.AccountStatus.BLOCKED)
        .count()
    )
    if previous_month_buyers > 0:
        buyers_change = (
            (current_month_buyers - previous_month_buyers) / previous_month_buyers
        ) * 100
    else:
        buyers_change = 100 if current_month_buyers > 0 else 0

    ###########################
    pending_sellers = Seller.objects.filter(status=Seller.Status.PENDING).count()
    pending_products = Seller.objects.filter(status=Product.Status.PENDING).count()
    low_stock_products = Product.objects.filter(stock_quantity__lte=20).count()

    from datetime import timedelta

    today_start = today.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    yesterday_start = today_start - timedelta(days=1)

    today_sales = Order.objects.filter(
        payment_status=Order.PaymentStatus.PAID,
        created_at__gte=today_start,
    ).aggregate(total=Sum("total"))["total"] or Decimal("0.00")

    yesterday_sales = Order.objects.filter(
        payment_status=Order.PaymentStatus.PAID,
        created_at__gte=yesterday_start,
        created_at__lt=today_start,
    ).aggregate(total=Sum("total"))["total"] or Decimal("0.00")

    if yesterday_sales > 0:
        sales_change = ((today_sales - yesterday_sales) / yesterday_sales) * 100
    else:
        sales_change = 100 if today_sales > 0 else 0

    top_selling_categories = (
        Category.objects.filter(is_active=True)
        .annotate(sold=Sum("products__order_items__quantity"))
        .order_by("-sold")[:5]
    )

    # Tell the type checker about dynamic attributes
    for category in top_selling_categories:
        sold: int = getattr(category, "sold", 0) or 0
        category.sold = sold

    # Use getattr to prevent linter complaints on list comprehension
    max_sold = max(
        (getattr(cat, "sold", 0) for cat in top_selling_categories), default=1
    )

    for category in top_selling_categories:
        # Annotate progress inline
        category.progress = round((category.sold / max_sold) * 100)

    ###################
    latest_orders = (
        Order.objects.select_related("user")
        .prefetch_related("seller_orders__seller")
        .order_by("-created_at")[:5]
    )
    return {
        "admin": {
            "total_revenue": Total_revenue,
            "revenue_change": round(percentage_change, 1),
            "revenue_increased": percentage_change >= 0,
            "total_orders": current_month_orders,
            # "orders_last_month": previous_month_orders,
            "orders_change": round(orders_change, 1),
            "orders_increased": orders_change >= 0,
            "total_products": total_products,
            "products_change": round(products_change, 1),
            "products_increased": products_change >= 0,
            "total_sellers": total_sellers,
            "sellers_change": round(sellers_change, 1),
            "sellers_increased": sellers_change >= 0,
            "total_buyers": total_buyers,
            "buyers_change": round(buyers_change, 1),
            "buyers_increased": buyers_change >= 0,
            "pending_sellers": pending_sellers,
            "pending_products": pending_products,
            "low_stock_products": low_stock_products,
            "today_sales": today_sales,
            "sales_change": round(sales_change, 1),
            "sales_increased": sales_change >= 0,
            "top_selling_categories": top_selling_categories,
            "latest_orders": latest_orders,
        }
    }
