from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Prefetch

from accounts.models import Address, User, Seller, SellerApplicationDocument
from orders.models import Order, SellerOrder, OrderItem
from products import services
from products.models import Product, Brand, Category


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
        1 for order in orders if order.overall_status == SellerOrder.Status.DELIVERED
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
        1 for order in orders if order.overall_status == SellerOrder.Status.CANCELLED
    )

    completion_percentage = (
        round((completed_orders / total_orders) * 100) if total_orders else 0
    )

    cancelled_percentage = (
        round((cancelled_orders / total_orders) * 100) if total_orders else 0
    )

    paid_orders = buyer.orders.filter(payment_status=Order.PaymentStatus.PAID)

    total_spent = paid_orders.aggregate(total=Sum("total"))["total"] or Decimal("0.00")

    total_paid_orders = paid_orders.count()

    average_order_value = (
        total_spent / total_paid_orders if total_paid_orders else Decimal("0.00")
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
    chart_start = today.replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    ) - timedelta(days=365)

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
        item["month"].strftime("%b"): float(item["total"]) for item in monthly_spending
    }

    months = []
    bars = []

    current = chart_start.replace(day=1)

    for _ in range(12):
        label = current.strftime("%b")
        months.append(label)
        bars.append(
            {
                "month": label,
                "total": monthly_map.get(label, 0),
                "height": 0,
            }
        )

        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)

    max_total = max((bar["total"] for bar in bars), default=1)

    for bar in bars:
        bar["height"] = round((bar["total"] / max_total) * 100) if max_total > 0 else 0

    recent_orders = buyer.orders.prefetch_related(
        "seller_orders__seller",
        "seller_orders__items__product",
    ).order_by("-created_at")[:10]

    for order in recent_orders:
        seller_orders = list(order.seller_orders.all())

        seller_names = [so.seller.store_name for so in seller_orders]

        if len(seller_names) == 1:
            order.seller_name = seller_names[0]
        else:
            order.seller_name = "Multiple Sellers"

        order.items_count = sum(
            item.quantity for so in seller_orders for item in so.items.all()
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
        "wishlist": services.get_user_wishlist(buyer),
    }


from django.db.models import Sum, Q, DecimalField, Value
from django.db.models.functions import Coalesce
from decimal import Decimal


def get_seller_detail(user_id):
    seller = Seller.objects.filter(id=user_id).first()

    if seller:
        # 2. Aggregate total sales directly from the seller's related orders
        total_sales = seller.orders.filter(
            status=SellerOrder.Status.DELIVERED
        ).aggregate(
            total=Coalesce(
                Sum("total"),
                Value(Decimal("0.00")),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
        )[
            "total"
        ]
    else:
        total_sales = Decimal("0.00")
    from django.utils import timezone

    total_products = seller.products.count()

    current_month_start = timezone.now().replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    products_added_this_month = seller.products.filter(
        created_at__gte=current_month_start
    ).count()

    published_products = seller.products.filter(status=Product.Status.PUBLISHED).count()

    drafted_products = seller.products.filter(status=Product.Status.DRAFT).count()

    hidden_products = seller.products.filter(status=Product.Status.HIDDEN).count()

    pending_products = seller.products.filter(status=Product.Status.PENDING).count()

    archived_products = seller.products.filter(status=Product.Status.ARCHIVED).count()

    out_of_stock_products = seller.products.filter(
        Q(status=Product.Status.OUT_OF_STOCK) | Q(stock_quantity=0)
    ).count()

    published_catalog_percentage = (
        round((published_products / total_products) * 100, 1) if total_products else 0
    )

    previous_month_end = current_month_start - timedelta(seconds=1)
    previous_month_start = previous_month_end.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    total_orders = seller.orders.count()
    pending_orders = seller.orders.filter(status=SellerOrder.Status.PENDING).count()
    processing_orders = seller.orders.filter(
        status=SellerOrder.Status.PROCESSING
    ).count()
    shipped_orders = seller.orders.filter(status=SellerOrder.Status.SHIPPED).count()
    completed_orders = seller.orders.filter(status=SellerOrder.Status.DELIVERED).count()

    today = timezone.localdate()

    today_orders = seller.orders.filter(created_at__date=today).count()

    orders = (
        seller.orders.select_related("order")
        .prefetch_related("items__product")
        .order_by("-created_at")
    )

    completed_order_percentage = (
        round(
            (completed_orders / total_orders) * 100,
            1,
        )
        if total_orders
        else 0
    )
    cancelled_orders = seller.orders.filter(status=SellerOrder.Status.CANCELLED).count()

    cancelled_order_percentage = (
        round(
            (cancelled_orders / total_orders) * 100,
            1,
        )
        if total_orders
        else 0
    )
    previous_month_orders = seller.orders.filter(
        created_at__gte=previous_month_start,
        created_at__lt=current_month_start,
    ).count()

    if previous_month_orders:
        order_change = round(
            ((total_orders - previous_month_orders) / previous_month_orders) * 100,
            1,
        )
    else:
        order_change = 100 if total_orders else 0

    order_increased = total_orders >= previous_month_orders

    lifetime_revenue = seller.orders.filter(
        status=SellerOrder.Status.DELIVERED
    ).aggregate(
        total=Coalesce(
            Sum("total"),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
    )[
        "total"
    ]
    current_month_revenue = seller.orders.filter(
        status=SellerOrder.Status.DELIVERED,
        created_at__gte=current_month_start,
    ).aggregate(
        total=Coalesce(
            Sum("total"),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
    )[
        "total"
    ]

    previous_month_revenue = seller.orders.filter(
        status=SellerOrder.Status.DELIVERED,
        created_at__gte=previous_month_start,
        created_at__lt=current_month_start,
    ).aggregate(
        total=Coalesce(
            Sum("total"),
            Value(Decimal("0.00")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
    )[
        "total"
    ]

    if previous_month_revenue:
        revenue_growth = round(
            ((current_month_revenue - previous_month_revenue) / previous_month_revenue)
            * 100,
            1,
        )
    else:
        revenue_growth = 100 if current_month_revenue else 0

    monthly_revenue = current_month_revenue

    average_order_value = (
        round(
            lifetime_revenue / total_orders,
            2,
        )
        if total_orders
        else Decimal("0.00")
    )

    from django.db.models import Count

    preferred_category = (
        seller.products.exclude(category=None)
        .values("category__name")
        .annotate(product_count=Count("id"))
        .order_by("-product_count")
        .first()
    )

    preferred_category = (
        preferred_category["category__name"] if preferred_category else "N/A"
    )

    best_selling_product = (
        OrderItem.objects.filter(
            seller_order__seller=seller,
            seller_order__status=SellerOrder.Status.DELIVERED,
        )
        .values("product__name")
        .annotate(quantity_sold=Sum("quantity"))
        .order_by("-quantity_sold")
        .first()
    )

    best_selling_product = (
        best_selling_product["product__name"] if best_selling_product else "N/A"
    )

    from django.db.models import Avg, ExpressionWrapper, DurationField, F

    average_shipping_duration = seller.orders.filter(
        shipped_at__isnull=False,
        delivered_at__isnull=False,
    ).aggregate(
        avg=Avg(
            ExpressionWrapper(
                F("delivered_at") - F("shipped_at"),
                output_field=DurationField(),
            )
        )
    )[
        "avg"
    ]

    average_shipping_days = (
        round(average_shipping_duration.total_seconds() / 86400, 1)
        if average_shipping_duration
        else None
    )

    repeat_buyers = (
        seller.orders.values("order__user")
        .annotate(order_count=Count("id"))
        .filter(order_count__gte=2)
        .count()
    )

    total_buyers = seller.orders.values("order__user").distinct().count()

    repeat_buyers_rate = (
        round(
            repeat_buyers * 100 / total_buyers,
            1,
        )
        if total_buyers
        else 0
    )

    fulfilled_orders = seller.orders.filter(status=SellerOrder.Status.DELIVERED).count()

    fulfillment_rate = (
        round(
            fulfilled_orders * 100 / total_orders,
            1,
        )
        if total_orders
        else 0
    )

    products = seller.products.annotate(
        total_sales=Coalesce(
            Sum(
                "order_items__quantity",
                filter=Q(
                    order_items__seller_order__status=SellerOrder.Status.DELIVERED
                ),
            ),
            0,
        )
    )

    top_buyers = (
        seller.orders.values(
            "order__user__id",
            "order__user__first_name",
            "order__user__last_name",
            "order__user__profile_image_url",
        )
        .annotate(
            total_orders=Count("id"),
            total_spent=Sum("total"),
        )
        .order_by("-total_spent")[:5]
    )
    customer_locations = (
        seller.orders.values("order__shipping_city")
        .annotate(total=Count("id"))
        .order_by("-total")
    )

    total_location_orders = seller.orders.count()

    for city in customer_locations:
        city["percentage"] = round(
            city["total"] * 100 / total_location_orders,
            1,
        )

    from django.db.models import Max

    recent_customers = (
        seller.orders.values(
            "order__user__id",
            "order__user__first_name",
            "order__user__last_name",
        )
        .annotate(
            total_orders=Count("id"),
            total_spent=Sum("total"),
            last_order=Max("created_at"),
        )
        .order_by("-last_order")[:3]
    )
    for customer in recent_customers:
        customer["repeat_buyer"] = customer["total_orders"] >= 2

    delivered_percentage = (
        round(
            (completed_orders / total_orders) * 100,
            1,
        )
        if total_orders
        else 0
    )

    top_selling_products = (
        OrderItem.objects.filter(
            seller_order__seller=seller,
            seller_order__status=SellerOrder.Status.DELIVERED,
        )
        .values("product__name")
        .annotate(total_sold=Sum("quantity"))
        .order_by("-total_sold")[:5]
    )
    max_sold = top_selling_products[0]["total_sold"] if top_selling_products else 0

    for product in top_selling_products:
        product["percentage"] = (
            round(
                product["total_sold"] * 100 / max_sold,
                1,
            )
            if max_sold
            else 0
        )

    top_categories = (
        OrderItem.objects.filter(
            seller_order__seller=seller,
            seller_order__status=SellerOrder.Status.DELIVERED,
        )
        .values("product__category__name")
        .annotate(total_sold=Sum("quantity"))
        .order_by("-total_sold")[:5]
    )

    max_category_sales = top_categories[0]["total_sold"] if top_categories else 0

    for category in top_categories:
        category["percentage"] = (
            round(
                category["total_sold"] * 100 / max_category_sales,
                1,
            )
            if max_category_sales
            else 0
        )

    import math

    DONUT_CIRCUMFERENCE = 2 * math.pi * 60

    donut_offset = round(
        DONUT_CIRCUMFERENCE * (100 - delivered_percentage) / 100,
        1,
    )
    from accounts.services import get_seller_application_documents

    documents = get_seller_application_documents(seller)

    return {
        "seller": seller,
        "total_sales": total_sales,
        "total_products": total_products,
        "products_this_month": products_added_this_month,
        "published_products": published_products,
        "published_catalog_percentage": published_catalog_percentage,
        "drafted_products": drafted_products,
        "hidden_products": hidden_products,
        "out_of_stock_products": out_of_stock_products,
        "pending_products": pending_products,
        "archived_products": archived_products,
        "total_orders": total_orders,
        "order_change": order_change,
        "order_increased": order_increased,
        "processing_orders": processing_orders,
        "shipped_orders": shipped_orders,
        "pending_orders": pending_orders,
        "today_orders": today_orders,
        "completed_orders": completed_orders,
        "completed_orders_percentage": completed_order_percentage,
        "cancelled_orders": cancelled_orders,
        "cancelled_orders_percentage": cancelled_order_percentage,
        "lifetime_revenue": lifetime_revenue,
        "revenue_growth": revenue_growth,
        "monthly_revenue": monthly_revenue,
        "average_order_value": average_order_value,
        "preferred_category": preferred_category,
        "best_selling_product": best_selling_product,
        "average_shipping_days": average_shipping_days,
        "repeat_buyers_rate": repeat_buyers_rate,
        "fulfillment_rate": fulfillment_rate,
        "response_time": "N/A",
        "products": products,
        "orders": orders,
        "top_buyers": top_buyers,
        "customer_locations": customer_locations,
        "recent_customers": recent_customers,
        "delivered_percentage": delivered_percentage,
        "donut_offset": donut_offset,
        "top_selling_products": top_selling_products,
        "top_categories": top_categories,
        "documents": documents,
    }


def get_pending_sellers():
    return Seller.objects.filter(status=Seller.Status.PENDING).all()


from django.core.exceptions import ObjectDoesNotExist


def get_pending_seller(seller_id):
    seller = Seller.objects.select_related(
        "application",
        "profile",
        "settings",
        "user",
    ).get(
        id=seller_id,
        status=Seller.Status.PENDING,
    )

    application = seller.application

    profile = getattr(seller, "profile", None)
    settings = getattr(seller, "settings", None)

    verification_score = 0

    if seller.store_name:
        verification_score += 15

    if seller.store_email:
        verification_score += 15

    if seller.store_description:
        verification_score += 20

    if seller.store_logo:
        verification_score += 15

    if seller.store_banner:
        verification_score += 15

    if seller.business_address:
        verification_score += 20

    trust_score = verification_score

    if trust_score >= 80:
        risk_level = "low"
    elif trust_score >= 60:
        risk_level = "medium"
    else:
        risk_level = "high"

    required_documents = len(SellerApplicationDocument.DocumentType.choices)

    uploaded_documents = application.documents.count()

    verified_documents = application.documents.filter(
        verified=True,
    ).count()

    documents_submitted = uploaded_documents

    flags_raised = application.flags.filter(
        resolved=False,
    ).count()

    document_completeness = (
        int(uploaded_documents / required_documents * 100) if required_documents else 0
    )

    profile_fields = [
        seller.store_name,
        seller.store_email,
        seller.store_description,
        seller.store_logo,
        seller.store_banner,
        seller.business_address,
        profile.business_category if profile else None,
        profile.business_type if profile else None,
        profile.national_id_number if profile else None,
        profile.years_in_business if profile else None,
        profile.expected_monthly_volume if profile else None,
        profile.product_categories if profile else None,
        profile.website if profile else None,
    ]

    completed_profile_fields = sum(bool(field) for field in profile_fields)

    profile_completeness = int(completed_profile_fields / len(profile_fields) * 100)

    compliance_checks = [
        verified_documents >= 2,  # CNIC Front + Back
        settings.business_registration_verified if settings else False,
        settings.bank_account_verified if settings else False,
        settings.address_verified if settings else False,
    ]

    compliance_score = int(sum(compliance_checks) / len(compliance_checks) * 100)

    payment_verified = settings.bank_account_verified if settings else False

    duplicate_accounts = None  # Future feature
    blacklist_clean = None  # Future feature

    import math

    CIRCUMFERENCE = 2 * math.pi * 60

    score_offset = CIRCUMFERENCE * (1 - trust_score / 100)

    from accounts.services import get_seller_application_documents

    documents = get_seller_application_documents(seller)

    from allauth.account.models import EmailAddress

    # -----------------------------
    # Identity Documents
    # -----------------------------
    cnic_front = documents.get("cnic_front")
    cnic_back = documents.get("cnic_back")

    identity_verified = (
        cnic_front
        and cnic_back
        and cnic_front.file
        and cnic_back.file
        and cnic_front.verified
        and cnic_back.verified
    )

    # -----------------------------
    # Email Verification
    # -----------------------------
    email_verified = EmailAddress.objects.filter(
        user=seller.user,
        verified=True,
    ).exists()

    # -----------------------------
    # Store Profile Completeness
    # -----------------------------
    store_profile_complete = all(
        [
            seller.store_logo,
            seller.store_banner,
            seller.store_description,
        ]
    )

    # -----------------------------
    # Business Address
    # -----------------------------
    business_address = bool(seller.business_address)
    return {
        "seller": seller,
        "application": application,
        "verification_score": verification_score,
        "trust_score": trust_score,
        "score_offset": score_offset,
        "risk_level": risk_level,
        "documents_submitted": documents_submitted,
        "verified_documents": verified_documents,
        "document_completeness": document_completeness,
        "flags_raised": flags_raised,
        "profile_completeness": profile_completeness,
        "compliance_score": compliance_score,
        "payment_verified": payment_verified,
        "duplicate_accounts": duplicate_accounts,
        "blacklist_clean": blacklist_clean,
        "documents": documents,
        # Checklist
        "identity_verified": identity_verified,
        "email_verified": email_verified,
        "store_profile_complete": store_profile_complete,
        "business_address": business_address,
    }


def get_products_catalog():
    published_products = Product.objects.filter(
        status=Product.Status.PUBLISHED,
    ).count()

    total_prodcuts = Product.objects.all().count()

    published_percentage_catalog = (
        round((published_products / total_prodcuts) * 100, 1) if total_prodcuts else 0
    )

    hidden_products = Product.objects.filter(
        status=Product.Status.HIDDEN,
    ).count()

    out_of_stock_products = Product.objects.filter(
        Q(status=Product.Status.OUT_OF_STOCK) | Q(stock_quantity=0)
    ).count()

    featured_products = Product.objects.filter(is_featured=True).count()

    archived_products = Product.objects.filter(status=Product.Status.ARCHIVED).count()

    drafted_products = Product.objects.filter(status=Product.Status.DRAFT).count()

    products = Product.objects.all().annotate(
        total_orders=Coalesce(
            Sum(
                "order_items__quantity",
                filter=Q(
                    order_items__seller_order__status=SellerOrder.Status.DELIVERED
                ),
            ),
            0,
        )
    )

    recently_added_products = products.order_by("-created_at")[:10]

    pending_approval_products = products.filter(status=Product.Status.PENDING)

    return {
        "published_products": published_products,
        "total_products": total_prodcuts,
        "published_percentage_catalog": published_percentage_catalog,
        "hidden_products": hidden_products,
        "out_of_stock_products": out_of_stock_products,
        "featured_products": featured_products,
        "archived_products": archived_products,
        "drafted_products": drafted_products,
        "products": products,
        "recently_added_products": recently_added_products,
        "pending_approval_products": pending_approval_products,
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


from django.db.models import Sum, Q, Value, IntegerField
from django.db.models.functions import Coalesce

from decimal import Decimal

from django.db.models import Count, Sum, Q
from django.utils import timezone

from products.models import Product
from orders.models import SellerOrder


from decimal import Decimal

from django.db.models import Count, Sum
from django.utils import timezone


def get_product_performance(product):
    now = timezone.now()

    # ---------------------------------------------------------
    # CURRENT MONTH
    # ---------------------------------------------------------

    current_month_start = now.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    # ---------------------------------------------------------
    # PREVIOUS MONTH
    # ---------------------------------------------------------

    if current_month_start.month == 1:
        previous_month_start = current_month_start.replace(
            year=current_month_start.year - 1,
            month=12,
        )
    else:
        previous_month_start = current_month_start.replace(
            month=current_month_start.month - 1,
        )

    delivered = SellerOrder.Status.DELIVERED

    # ---------------------------------------------------------
    # ALL-TIME PERFORMANCE
    # ---------------------------------------------------------

    all_time = product.order_items.filter(
        seller_order__status=delivered,
    ).aggregate(
        sales=Sum("total"),
        orders=Count(
            "seller_order__order",
            distinct=True,
        ),
        units=Sum("quantity"),
    )

    total_sales = all_time["sales"] or Decimal("0.00")
    total_orders = all_time["orders"] or 0
    units_sold = all_time["units"] or 0

    # ---------------------------------------------------------
    # CURRENT MONTH PERFORMANCE
    # ---------------------------------------------------------

    current_month = product.order_items.filter(
        seller_order__status=delivered,
        seller_order__delivered_at__gte=current_month_start,
        seller_order__delivered_at__lt=now,
    ).aggregate(
        sales=Sum("total"),
        orders=Count(
            "seller_order__order",
            distinct=True,
        ),
        units=Sum("quantity"),
    )

    current_sales = current_month["sales"] or Decimal("0.00")
    current_orders = current_month["orders"] or 0
    current_units = current_month["units"] or 0

    # ---------------------------------------------------------
    # PREVIOUS MONTH PERFORMANCE
    # ---------------------------------------------------------

    previous_month = product.order_items.filter(
        seller_order__status=delivered,
        seller_order__delivered_at__gte=previous_month_start,
        seller_order__delivered_at__lt=current_month_start,
    ).aggregate(
        sales=Sum("total"),
        orders=Count(
            "seller_order__order",
            distinct=True,
        ),
        units=Sum("quantity"),
    )

    previous_sales = previous_month["sales"] or Decimal("0.00")
    previous_orders = previous_month["orders"] or 0
    previous_units = previous_month["units"] or 0

    # ---------------------------------------------------------
    # PERCENTAGE CHANGE
    # ---------------------------------------------------------

    def calculate_change(current, previous):
        if previous == 0:
            if current == 0:
                return 0
            return None

        return round(
            ((current - previous) / previous) * 100,
            1,
        )

    sales_change = calculate_change(
        current_sales,
        previous_sales,
    )

    orders_change = calculate_change(
        current_orders,
        previous_orders,
    )

    units_change = calculate_change(
        current_units,
        previous_units,
    )

    # ---------------------------------------------------------
    # CHANGE DIRECTION
    # ---------------------------------------------------------

    sales_increased = current_sales > previous_sales
    orders_increased = current_orders > previous_orders
    units_increased = current_units > previous_units

    # ---------------------------------------------------------
    # REVENUE
    # ---------------------------------------------------------
    #
    # Product-level revenue is based on delivered OrderItems.
    # OrderItem.total already represents the total for that
    # product line (price × quantity at order time).
    #

    revenue = total_sales

    # ---------------------------------------------------------
    # RETURN RATE
    # ---------------------------------------------------------
    #
    # There is currently no return/refund model associated
    # with products or OrderItems.
    #

    return_rate = None

    # ---------------------------------------------------------
    # CURRENT STOCK
    # ---------------------------------------------------------

    current_stock = product.stock_quantity

    # ---------------------------------------------------------
    # LOW STOCK THRESHOLD
    # ---------------------------------------------------------

    low_stock_threshold = product.min_stock_level

    # ---------------------------------------------------------
    # WISHLIST ADDS
    # ---------------------------------------------------------
    #
    # Product has the reverse relation:
    # product.wishlisted_by
    #

    wishlist_adds = product.wishlisted_by.count()

    # ---------------------------------------------------------
    # PRODUCT VIEWS
    # ---------------------------------------------------------
    #
    # No product-view/analytics model currently exists.
    #

    product_views = None

    reserved_units = product.order_items.filter(
    seller_order__status__in=[
        SellerOrder.Status.PENDING,
        SellerOrder.Status.CONFIRMED,
        SellerOrder.Status.PROCESSING,
        SellerOrder.Status.SHIPPED,
        ]
    ).aggregate(
        total=Sum("quantity")
    )["total"] or 0

    if current_stock <= 0:
        stock_health = "out_of_stock"
    elif current_stock <= low_stock_threshold:
        stock_health = "low"
    else:
        stock_health = "healthy"

    available_stock = current_stock - reserved_units

    # ---------------------------------------------------------
    # RETURN RESULT
    # ---------------------------------------------------------


    return {
        "total_sales": total_sales,
        "sales_change": sales_change,
        "sales_increased": sales_increased,

        "total_orders": total_orders,
        "orders_change": orders_change,
        "orders_increased": orders_increased,

        "units_sold": units_sold,
        "units_change": units_change,
        "units_increased": units_increased,

        "revenue": revenue,
        "return_rate": return_rate,

        "current_stock": current_stock,
        "low_stock_threshold": low_stock_threshold,

        "wishlist_adds": wishlist_adds,
        "product_views": product_views,
        "reserved_units": reserved_units,
        "available_stock": available_stock,
        "stock_health": stock_health,
    }

def get_product_orders(product):
    statuses = SellerOrder.Status

    # ---------------------------------------------------------
    # BASE QUERY
    # ---------------------------------------------------------

    product_order_items = product.order_items.select_related(
        "seller_order",
        "seller_order__order",
        "seller_order__seller",
    )

    # ---------------------------------------------------------
    # TOTAL ORDERS
    # ---------------------------------------------------------

    total_orders = product_order_items.values(
        "seller_order__order_id"
    ).distinct().count()

    # ---------------------------------------------------------
    # STATUS COUNTS
    # ---------------------------------------------------------

    pending_orders = product_order_items.filter(
        seller_order__status=statuses.PENDING,
    ).values(
        "seller_order__order_id"
    ).distinct().count()

    confirmed_orders = product_order_items.filter(
        seller_order__status=statuses.CONFIRMED,
    ).values(
        "seller_order__order_id"
    ).distinct().count()

    processing_orders = product_order_items.filter(
        seller_order__status=statuses.PROCESSING,
    ).values(
        "seller_order__order_id"
    ).distinct().count()

    shipped_orders = product_order_items.filter(
        seller_order__status=statuses.SHIPPED,
    ).values(
        "seller_order__order_id"
    ).distinct().count()

    delivered_orders = product_order_items.filter(
        seller_order__status=statuses.DELIVERED,
    ).values(
        "seller_order__order_id"
    ).distinct().count()

    cancelled_orders = product_order_items.filter(
        seller_order__status=statuses.CANCELLED,
    ).values(
        "seller_order__order_id"
    ).distinct().count()

    # ---------------------------------------------------------
    # REFUNDED ORDERS
    # ---------------------------------------------------------

    refunded_orders = product_order_items.filter(
        seller_order__order__payment_status=Order.PaymentStatus.REFUNDED,
    ).values(
        "seller_order__order_id"
    ).distinct().count()

    # ---------------------------------------------------------
    # RETURN ORDERS
    # ---------------------------------------------------------
    #
    # No return model/status currently exists.
    #

    return_orders = None

    # ---------------------------------------------------------
    # ACTUAL ORDERS
    # ---------------------------------------------------------

    orders = (
        SellerOrder.objects
        .filter(
            items__product=product,
        )
        .select_related(
            "order",
            "seller",
        )
        .prefetch_related(
            Prefetch(
                "items",
                queryset=OrderItem.objects.filter(
                    product=product,
                ),
                to_attr="product_items",
            )
        )
        .order_by("-created_at")
        .distinct()
    )

    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "confirmed_orders": confirmed_orders,
        "processing_orders": processing_orders,
        "shipped_orders": shipped_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,
        "return_orders": return_orders,
        "refunded_orders": refunded_orders,
        "orders": orders,
    }

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from orders.models import SellerOrder


def get_product_revenue_trend(product):
    now = timezone.localtime(timezone.now())

    # Monday of the current week
    current_week_start = (
        now - timedelta(days=now.weekday())
    ).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    # ---------------------------------------------------------
    # LAST 8 WEEKS
    # ---------------------------------------------------------

    week_starts = [
        current_week_start - timedelta(weeks=i)
        for i in range(7, -1, -1)
    ]

    first_week_start = week_starts[0]
    next_week_start = current_week_start + timedelta(weeks=1)

    # ---------------------------------------------------------
    # FETCH ALL DELIVERED PRODUCT SALES FOR THE PERIOD
    # ---------------------------------------------------------

    weekly_sales = (
        product.order_items
        .filter(
            seller_order__status=SellerOrder.Status.DELIVERED,
            seller_order__delivered_at__gte=first_week_start,
            seller_order__delivered_at__lt=next_week_start,
        )
        .values(
            "seller_order__delivered_at",
        )
        .annotate(
            revenue=Sum("total"),
        )
    )

    # ---------------------------------------------------------
    # MAP SALES TO WEEK
    # ---------------------------------------------------------

    revenue_by_week = {
        week_start: Decimal("0.00")
        for week_start in week_starts
    }

    for row in weekly_sales:
        delivered_at = timezone.localtime(
            row["seller_order__delivered_at"]
        )

        week_start = (
            delivered_at - timedelta(days=delivered_at.weekday())
        ).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

        if week_start in revenue_by_week:
            revenue_by_week[week_start] += (
                row["revenue"] or Decimal("0.00")
            )

    # ---------------------------------------------------------
    # BUILD CHART DATA
    # ---------------------------------------------------------

    trend = []

    for week_start in week_starts:
        week_end = week_start + timedelta(days=6)

        trend.append({
            "date": week_start,
            "label": week_start.strftime("%b %d").replace(" 0", " "),
            "revenue": revenue_by_week[week_start],
            "revenue_display": (
                f"Rs. {revenue_by_week[week_start]:,.0f}"
            ),
        })
    return trend

def get_product_order_status_mix(product):
    statuses = SellerOrder.Status

    status_counts = (
        product.order_items
        .values("seller_order__status")
        .annotate(total=Count("seller_order__order", distinct=True))
    )

    counts = {
        row["seller_order__status"]: row["total"]
        for row in status_counts
    }

    total_orders = sum(counts.values())

    delivered = counts.get(statuses.DELIVERED, 0)
    pending = counts.get(statuses.PENDING, 0)
    confirmed = counts.get(statuses.CONFIRMED, 0)
    processing = counts.get(statuses.PROCESSING, 0)
    shipped = counts.get(statuses.SHIPPED, 0)
    cancelled = counts.get(statuses.CANCELLED, 0)

    def percentage(value):
        if total_orders == 0:
            return 0

        return round((value / total_orders) * 100, 1)

    return {
        "total": total_orders,

        "delivered": delivered,
        "delivered_percentage": percentage(delivered),

        "pending": pending,
        "pending_percentage": percentage(pending),

        "confirmed": confirmed,
        "confirmed_percentage": percentage(confirmed),

        "processing": processing,
        "processing_percentage": percentage(processing),

        "shipped": shipped,
        "shipped_percentage": percentage(shipped),

        "cancelled": cancelled,
        "cancelled_percentage": percentage(cancelled),
    }

def get_product_customer_locations(product):
    product_orders = product.order_items.values(
        "seller_order__order_id"
    ).distinct()

    total_orders = product_orders.count()

    if total_orders == 0:
        return []

    city_counts = (
        Order.objects
        .filter(
            id__in=product_orders,
        )
        .exclude(
            shipping_city__isnull=True,
        )
        .exclude(
            shipping_city__exact="",
        )
        .values("shipping_city")
        .annotate(
            orders=Count("id", distinct=True),
        )
        .order_by("-orders", "shipping_city")
    )

    cities = list(city_counts)

    top_cities = cities[:4]

    top_count = sum(
        city["orders"]
        for city in top_cities
    )

    locations = []

    for city in top_cities:
        percentage = round(
            (city["orders"] / total_orders) * 100,
            1,
        )

        locations.append({
            "name": city["shipping_city"],
            "orders": city["orders"],
            "percentage": percentage,
        })

    other_orders = total_orders - top_count

    if other_orders > 0:
        locations.append({
            "name": "Other",
            "orders": other_orders,
            "percentage": round(
                (other_orders / total_orders) * 100,
                1,
            ),
        })

    return locations

def get_product_kpis(product):
    now = timezone.now()

    # ---------------------------------------------------------
    # CURRENT MONTH
    # ---------------------------------------------------------

    current_month_start = now.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    # ---------------------------------------------------------
    # PREVIOUS MONTH
    # ---------------------------------------------------------

    if current_month_start.month == 1:
        previous_month_start = current_month_start.replace(
            year=current_month_start.year - 1,
            month=12,
        )
    else:
        previous_month_start = current_month_start.replace(
            month=current_month_start.month - 1,
        )

    # ---------------------------------------------------------
    # WISHLIST ADDS
    # ---------------------------------------------------------

    total_wishlist_adds = product.wishlisted_by.count()

    current_wishlist_adds = product.wishlisted_by.filter(
        created_at__gte=current_month_start,
    ).count()

    previous_wishlist_adds = product.wishlisted_by.filter(
        created_at__gte=previous_month_start,
        created_at__lt=current_month_start,
    ).count()

    # ---------------------------------------------------------
    # WISHLIST CHANGE
    # ---------------------------------------------------------

    def calculate_change(current, previous):
        if previous == 0:
            if current == 0:
                return 0
            return None

        return round(
            ((current - previous) / previous) * 100,
            1,
        )

    wishlist_change = calculate_change(
        current_wishlist_adds,
        previous_wishlist_adds,
    )

    wishlist_increased = (
        current_wishlist_adds > previous_wishlist_adds
    )

    # ---------------------------------------------------------
    # PRODUCT ORDERS
    # ---------------------------------------------------------

    order_data = product.order_items.filter(
        seller_order__status=SellerOrder.Status.DELIVERED,
    ).aggregate(
        revenue=Sum("total"),
        orders=Count(
            "seller_order__order",
            distinct=True,
        ),
    )

    revenue = order_data["revenue"] or Decimal("0.00")
    total_orders = order_data["orders"] or 0

    # ---------------------------------------------------------
    # AVERAGE ORDER VALUE
    # ---------------------------------------------------------
    #
    # Product revenue / distinct delivered orders containing
    # this product.
    #

    if total_orders:
        average_order_value = (
            revenue / total_orders
        )
    else:
        average_order_value = Decimal("0.00")

    # ---------------------------------------------------------
    # CURRENT MONTH AOV
    # ---------------------------------------------------------

    current_orders_data = product.order_items.filter(
        seller_order__status=SellerOrder.Status.DELIVERED,
        seller_order__delivered_at__gte=current_month_start,
    ).aggregate(
        revenue=Sum("total"),
        orders=Count(
            "seller_order__order",
            distinct=True,
        ),
    )

    current_revenue = (
        current_orders_data["revenue"]
        or Decimal("0.00")
    )

    current_orders = (
        current_orders_data["orders"]
        or 0
    )

    current_aov = (
        current_revenue / current_orders
        if current_orders
        else Decimal("0.00")
    )

    # ---------------------------------------------------------
    # PREVIOUS MONTH AOV
    # ---------------------------------------------------------

    previous_orders_data = product.order_items.filter(
        seller_order__status=SellerOrder.Status.DELIVERED,
        seller_order__delivered_at__gte=previous_month_start,
        seller_order__delivered_at__lt=current_month_start,
    ).aggregate(
        revenue=Sum("total"),
        orders=Count(
            "seller_order__order",
            distinct=True,
        ),
    )

    previous_revenue = (
        previous_orders_data["revenue"]
        or Decimal("0.00")
    )

    previous_orders = (
        previous_orders_data["orders"]
        or 0
    )

    previous_aov = (
        previous_revenue / previous_orders
        if previous_orders
        else Decimal("0.00")
    )

    aov_change = calculate_change(
        current_aov,
        previous_aov,
    )

    aov_increased = current_aov > previous_aov

    # ---------------------------------------------------------
    # CONVERSION RATE
    # ---------------------------------------------------------
    #
    # Cannot be calculated because Product Views /
    # ProductVisit data does not exist.
    #

    conversion_rate = None
    conversion_change = None
    conversion_increased = None

    # ---------------------------------------------------------
    # RETURN RATE
    # ---------------------------------------------------------
    #
    # No return / return-item model currently exists.
    #

    return_rate = None
    return_change = None
    return_increased = None

    # ---------------------------------------------------------
    # RESULT
    # ---------------------------------------------------------

    return {
        "wishlist_adds": total_wishlist_adds,
        "wishlist_change": wishlist_change,
        "wishlist_increased": wishlist_increased,

        "conversion_rate": conversion_rate,
        "conversion_change": conversion_change,
        "conversion_increased": conversion_increased,

        "average_order_value": average_order_value,
        "aov_change": aov_change,
        "aov_increased": aov_increased,

        "return_rate": return_rate,
        "return_change": return_change,
        "return_increased": return_increased,
    }

def get_product_moderation(product):
    seller = product.seller

    # ---------------------------------------------------------
    # APPROVAL STATUS
    # ---------------------------------------------------------

    approval_status = {
        "label": "Approved" if product.is_approved else "Not Approved",
        "class": "c-success" if product.is_approved else "c-warning",
    }

    # ---------------------------------------------------------
    # PUBLICATION STATUS
    # ---------------------------------------------------------

    publication_labels = {
        Product.Status.DRAFT: "Draft",
        Product.Status.PUBLISHED: "Published",
        Product.Status.HIDDEN: "Hidden",
        Product.Status.OUT_OF_STOCK: "Out of Stock",
        Product.Status.ARCHIVED: "Archived",
        Product.Status.PENDING: "Pending",
        Product.Status.REJECTED: "Rejected",
    }

    publication_status = {
        "label": publication_labels.get(
            product.status,
            product.status.title(),
        ),
        "class": (
            "c-success"
            if product.status == Product.Status.PUBLISHED
            else "c-warning"
        ),
    }

    # ---------------------------------------------------------
    # VISIBILITY
    # ---------------------------------------------------------

    is_visible = (
        product.status == Product.Status.PUBLISHED
        and product.is_approved
    )

    visibility = {
        "label": "Visible" if is_visible else "Hidden",
        "class": "c-success" if is_visible else "c-muted",
    }

    # ---------------------------------------------------------
    # FEATURED STATUS
    # ---------------------------------------------------------

    featured_status = {
        "label": "Featured" if product.is_featured else "Not Featured",
        "class": "c-accent" if product.is_featured else "c-muted",
    }

    # ---------------------------------------------------------
    # SELLER VERIFICATION
    # ---------------------------------------------------------

    seller_verified = bool(
        seller
        and seller.status == seller.Status.VERIFIED
    )

    seller_verification = {
        "label": "Verified" if seller_verified else "Not Verified",
        "class": "c-success" if seller_verified else "c-warning",
    }

    # ---------------------------------------------------------
    # PRODUCT INFORMATION
    # ---------------------------------------------------------

    product_information_complete = bool(
        product.name
        and product.description
    )

    # ---------------------------------------------------------
    # IMAGES
    # ---------------------------------------------------------

    image_count = product.images.count()

    images_available = image_count > 0

    # ---------------------------------------------------------
    # CATEGORY
    # ---------------------------------------------------------

    category_assigned = product.category is not None

    # ---------------------------------------------------------
    # BRAND
    # ---------------------------------------------------------

    brand_assigned = product.brand is not None

    # ---------------------------------------------------------
    # PRICE
    # ---------------------------------------------------------

    price_valid = (
        product.price is not None
        and product.price > 0
        and (
            product.discount_price is None
            or (
                product.discount_price > 0
                and product.discount_price < product.price
            )
        )
    )

    # ---------------------------------------------------------
    # STOCK
    # ---------------------------------------------------------

    stock_available = product.stock_quantity > 0

    # ---------------------------------------------------------
    # REQUIRED INFORMATION
    # ---------------------------------------------------------

    required_information_provided = bool(
        product.sku
        and product.barcode
    )

    # ---------------------------------------------------------
    # DESCRIPTION REVIEW
    # ---------------------------------------------------------

    description_length = len(
        (product.description or "").strip()
    )

    description_requires_review = (
        description_length < 100
    )

    # ---------------------------------------------------------
    # POLICY / CONTENT QUALITY / MODERATION
    # ---------------------------------------------------------
    #
    # These are NOT stored in the current database.
    #

    policy_compliance = None
    moderation_score = None

    # We can only provide a derived content-quality state.
    if product_information_complete and not description_requires_review:
        content_quality = {
            "label": "Good",
            "class": "c-success",
        }
    elif product_information_complete:
        content_quality = {
            "label": "Needs Review",
            "class": "c-warning",
        }
    else:
        content_quality = {
            "label": "Incomplete",
            "class": "c-danger",
        }

    # ---------------------------------------------------------
    # CHECKLIST
    # ---------------------------------------------------------

    checklist = [
        {
            "title": "Product Information Complete",
            "description": (
                "Name and description provided"
            ),
            "complete": product_information_complete,
            "warning": False,
        },
        {
            "title": "Images Available",
            "description": (
                f"{image_count} product image"
                f"{'' if image_count == 1 else 's'} uploaded"
            ),
            "complete": images_available,
            "warning": False,
        },
        {
            "title": "Category Assigned",
            "description": (
                product.category.name
                if product.category
                else "No category assigned"
            ),
            "complete": category_assigned,
            "warning": False,
        },
        {
            "title": "Brand Assigned",
            "description": (
                product.brand.name
                if product.brand
                else "No brand assigned"
            ),
            "complete": brand_assigned,
            "warning": False,
        },
        {
            "title": "Price Valid",
            "description": (
                "Regular and discount price set correctly"
                if price_valid
                else "Price information requires review"
            ),
            "complete": price_valid,
            "warning": not price_valid,
        },
        {
            "title": "Stock Available",
            "description": (
                f"{product.stock_quantity} units in stock"
            ),
            "complete": stock_available,
            "warning": not stock_available,
        },
        {
            "title": "Seller Verified",
            "description": (
                f"{seller.store_name} is a verified seller"
                if seller
                else "No seller assigned"
            ),
            "complete": seller_verified,
            "warning": not seller_verified,
        },
        {
            "title": "Required Information Provided",
            "description": (
                "SKU and barcode present"
                if required_information_provided
                else "SKU or barcode is missing"
            ),
            "complete": required_information_provided,
            "warning": not required_information_provided,
        },
        {
            "title": "Description Review",
            "description": (
                "Long description could be more detailed for SEO"
                if description_requires_review
                else "Description length looks good"
            ),
            "complete": not description_requires_review,
            "warning": description_requires_review,
        },
    ]

    return {
        "approval_status": approval_status,
        "publication_status": publication_status,
        "visibility": visibility,
        "featured_status": featured_status,
        "policy_compliance": policy_compliance,
        "content_quality": content_quality,
        "seller_verification": seller_verification,
        "moderation_score": moderation_score,
        "checklist": checklist,
    }

def get_product_risk_review(product):
    seller = product.seller

    risks = []

    # ---------------------------------------------------------
    # DUPLICATE PRODUCT
    # ---------------------------------------------------------
    #
    # We can perform a basic duplicate check using the SKU,
    # barcode, and exact product name.
    #

    duplicate_queryset = Product.objects.exclude(
        pk=product.pk
    )

    duplicate_sku = (
        product.sku
        and duplicate_queryset.filter(
            sku=product.sku,
        ).exists()
    )

    duplicate_barcode = (
        product.barcode
        and duplicate_queryset.filter(
            barcode=product.barcode,
        ).exists()
    )

    duplicate_name = duplicate_queryset.filter(
        name__iexact=product.name,
    ).exists()

    if duplicate_sku or duplicate_barcode:
        risks.append({
            "title": "Duplicate Product",
            "description": "Matching SKU or barcode found",
            "level": "High",
            "class": "is-high",
        })
    elif duplicate_name:
        risks.append({
            "title": "Duplicate Product",
            "description": "Another listing has the same product name",
            "level": "Medium",
            "class": "is-medium",
        })
    else:
        risks.append({
            "title": "Duplicate Product",
            "description": "No matching SKU, barcode, or product name found",
            "level": "Low",
            "class": "",
        })

    # ---------------------------------------------------------
    # COUNTERFEIT RISK
    # ---------------------------------------------------------
    #
    # There is no counterfeit-verification model.
    #

    if product.brand:
        risks.append({
            "title": "Counterfeit Risk",
            "description": "Brand is assigned to the product",
            "level": "Not Available",
            "class": "",
        })
    else:
        risks.append({
            "title": "Counterfeit Risk",
            "description": "No brand assigned for verification",
            "level": "Not Available",
            "class": "",
        })

    # ---------------------------------------------------------
    # COPYRIGHT RISK
    # ---------------------------------------------------------
    #
    # The database does not record image ownership or copyright
    # verification.
    #

    risks.append({
        "title": "Copyright Risk",
        "description": "Copyright ownership cannot be verified from current data",
        "level": "Not Available",
        "class": "",
    })

    # ---------------------------------------------------------
    # RESTRICTED CATEGORY
    # ---------------------------------------------------------
    #
    # There is no restricted-category flag/model in the current
    # database.
    #

    if product.category:
        risks.append({
            "title": "Restricted Category",
            "description": (
                f"Category assigned: {product.category.name}; "
                "restricted-category rules are not configured"
            ),
            "level": "Not Available",
            "class": "",
        })
    else:
        risks.append({
            "title": "Restricted Category",
            "description": "No category assigned",
            "level": "Medium",
            "class": "is-medium",
        })

    # ---------------------------------------------------------
    # SUSPICIOUS PRICING
    # ---------------------------------------------------------

    if product.price and product.discount_price:
        discount_percentage = (
            (product.price - product.discount_price)
            / product.price
        ) * 100

        if discount_percentage >= 50:
            pricing_level = "Medium"
            pricing_class = "is-medium"
            pricing_description = (
                f"{round(discount_percentage)}% discount detected"
            )
        else:
            pricing_level = "Low"
            pricing_class = ""
            pricing_description = (
                f"{round(discount_percentage)}% discount"
            )

    elif product.price:
        pricing_level = "Low"
        pricing_class = ""
        pricing_description = "No discount currently applied"

    else:
        pricing_level = "Medium"
        pricing_class = "is-medium"
        pricing_description = "Product price is missing"

    risks.append({
        "title": "Suspicious Pricing",
        "description": pricing_description,
        "level": pricing_level,
        "class": pricing_class,
    })

    # ---------------------------------------------------------
    # POLICY VIOLATION
    # ---------------------------------------------------------
    #
    # No product-policy violation model exists.
    #

    risks.append({
        "title": "Policy Violation",
        "description": "No policy violation data is available",
        "level": "Not Available",
        "class": "",
    })

    # ---------------------------------------------------------
    # INVALID PRODUCT INFORMATION
    # ---------------------------------------------------------

    missing_fields = []

    if not product.name:
        missing_fields.append("name")

    if not product.description:
        missing_fields.append("description")

    if not product.sku:
        missing_fields.append("SKU")

    if not product.barcode:
        missing_fields.append("barcode")

    if not product.category:
        missing_fields.append("category")

    if missing_fields:
        risks.append({
            "title": "Invalid Product Information",
            "description": (
                "Missing: " + ", ".join(missing_fields)
            ),
            "level": "Medium",
            "class": "is-medium",
        })
    else:
        risks.append({
            "title": "Invalid Product Information",
            "description": "All available required fields are populated",
            "level": "Low",
            "class": "",
        })

    # ---------------------------------------------------------
    # SELLER RISK
    # ---------------------------------------------------------

    if not seller:
        risks.append({
            "title": "Seller Risk",
            "description": "No seller assigned",
            "level": "High",
            "class": "is-high",
        })
    elif seller.status == seller.Status.VERIFIED:
        risks.append({
            "title": "Seller Risk",
            "description": "Seller is verified",
            "level": "Low",
            "class": "",
        })
    elif seller.status in (
        seller.Status.SUSPENDED,
        seller.Status.BLOCKED,
        seller.Status.REJECTED,
    ):
        risks.append({
            "title": "Seller Risk",
            "description": (
                f"Seller status: "
                f"{seller.get_status_display()}"
            ),
            "level": "High",
            "class": "is-high",
        })
    else:
        risks.append({
            "title": "Seller Risk",
            "description": (
                f"Seller status: "
                f"{seller.get_status_display()}"
            ),
            "level": "Medium",
            "class": "is-medium",
        })

    # ---------------------------------------------------------
    # IMAGE QUALITY
    # ---------------------------------------------------------
    #
    # ProductImage does not store width/height, so we cannot
    # verify the 1000x1000 requirement from the database alone.
    #

    image_count = product.images.count()

    if image_count == 0:
        risks.append({
            "title": "Image Quality",
            "description": "No product images uploaded",
            "level": "Medium",
            "class": "is-medium",
        })
    else:
        risks.append({
            "title": "Image Quality",
            "description": (
                f"{image_count} product image"
                f"{'' if image_count == 1 else 's'} uploaded; "
                "image resolution is not stored"
            ),
            "level": "Not Available",
            "class": "",
        })

    # ---------------------------------------------------------
    # TRADEMARK RISK
    # ---------------------------------------------------------

    if product.brand:
        risks.append({
            "title": "Trademark Risk",
            "description": (
                f"Brand assigned: {product.brand.name}; "
                "trademark ownership cannot be verified"
            ),
            "level": "Not Available",
            "class": "",
        })
    else:
        risks.append({
            "title": "Trademark Risk",
            "description": "No brand assigned",
            "level": "Not Available",
            "class": "",
        })

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------

    high_count = sum(
        1 for risk in risks
        if risk["level"] == "High"
    )

    medium_count = sum(
        1 for risk in risks
        if risk["level"] == "Medium"
    )

    low_count = sum(
        1 for risk in risks
        if risk["level"] == "Low"
    )

    unavailable_count = sum(
        1 for risk in risks
        if risk["level"] == "Not Available"
    )

    return {
        "risks": risks,
        "high_count": high_count,
        "medium_count": medium_count,
        "low_count": low_count,
        "unavailable_count": unavailable_count,
    }

from django.db.models import Sum, Count
from decimal import Decimal


def get_product_seller_summary(product):
    seller = product.seller

    if not seller:
        return {
            "verification_status": {
                "label": "Not Available",
                "class": "c-muted",
            },
            "seller_status": {
                "label": "Not Available",
                "class": "c-muted",
            },
            "store_rating": None,
            "total_products": 0,
            "seller_orders": 0,
            "seller_revenue": Decimal("0.00"),
        }

    # ---------------------------------------------------------
    # VERIFICATION STATUS
    # ---------------------------------------------------------

    is_verified = (
        seller.status == seller.Status.VERIFIED
    )

    verification_status = {
        "label": "Verified" if is_verified else "Not Verified",
        "class": "c-success" if is_verified else "c-warning",
    }

    # ---------------------------------------------------------
    # SELLER STATUS
    # ---------------------------------------------------------

    seller_status_labels = {
        seller.Status.PENDING: "Pending",
        seller.Status.VERIFIED: "Active",
        seller.Status.DEACTIVATED: "Inactive",
        seller.Status.SUSPENDED: "Suspended",
        seller.Status.BLOCKED: "Blocked",
        seller.Status.REJECTED: "Rejected",
    }

    seller_status_classes = {
        seller.Status.PENDING: "c-warning",
        seller.Status.VERIFIED: "c-success",
        seller.Status.DEACTIVATED: "c-muted",
        seller.Status.SUSPENDED: "c-danger",
        seller.Status.BLOCKED: "c-danger",
        seller.Status.REJECTED: "c-danger",
    }

    seller_status = {
        "label": seller_status_labels.get(
            seller.status,
            seller.status,
        ),
        "class": seller_status_classes.get(
            seller.status,
            "c-muted",
        ),
    }

    # ---------------------------------------------------------
    # STORE RATING
    # ---------------------------------------------------------
    #
    # No seller rating/review model currently exists.
    #

    store_rating = None

    # ---------------------------------------------------------
    # TOTAL PRODUCTS
    # ---------------------------------------------------------

    total_products = seller.products.count()

    # ---------------------------------------------------------
    # SELLER ORDERS
    # ---------------------------------------------------------

    seller_orders = seller.orders.count()

    # ---------------------------------------------------------
    # SELLER REVENUE
    # ---------------------------------------------------------

    revenue_data = seller.orders.filter(
        status=SellerOrder.Status.DELIVERED,
    ).aggregate(
        revenue=Sum("total"),
    )

    seller_revenue = (
        revenue_data["revenue"]
        or Decimal("0.00")
    )

    return {
        "verification_status": verification_status,
        "seller_status": seller_status,
        "store_rating": store_rating,
        "total_products": total_products,
        "seller_orders": seller_orders,
        "seller_revenue": seller_revenue,
    }

def get_product_detail(product_slug):
    product = (
        Product.objects
        .filter(slug=product_slug)
        .select_related(
            "category",
            "brand",
            "seller",
        )
        .prefetch_related(
            "images",
        )
        .first()
    )

    if not product:
        return None

    performance = get_product_performance(product)
    order_data = get_product_orders(product)
    revenue_trend = get_product_revenue_trend(product)
    customer_locations = get_product_customer_locations(product)
    kpis = get_product_kpis(product)
    moderation = get_product_moderation(product)
    risk_review = get_product_risk_review(product)
    seller_summary = get_product_seller_summary(product)
    brands = Brand.objects.filter(
        is_active=True
    ).order_by("name")
    status_mix = get_product_order_status_mix(product)


    return {
        "product": product,
        "performance": performance,
        "brands": brands,
        "order_data": order_data,
        "revenue_trend": revenue_trend,
        "status_mix": status_mix,
        "customer_locations": customer_locations,
        "kpis": kpis,
        "moderation": moderation,
        "risk_review": risk_review,
        "seller_summary": seller_summary,
        
    }

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
        f"order-history-user-{user_id}-" f"{timezone.now().strftime('%Y-%m-%d')}.csv"
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
                    order.payment_status,
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


def export_seller_orders(seller):
    seller_orders = (
        SellerOrder.objects.filter(seller=seller)
        .select_related("order", "seller")
        .prefetch_related("items__product")
        .order_by("-created_at")
    )

    response = HttpResponse(content_type="text/csv")

    filename = (
        f"{seller.store_name}-orders-" f"{timezone.now().strftime('%Y-%m-%d')}.csv"
    )

    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)

    writer.writerow(
        [
            "Order Number",
            "Order Date",
            "Status",
            "Payment Status",
            "Customer",
            "Products",
            "Subtotal",
            "Shipping",
            "Discount",
            "Tax",
            "Total",
            "Tracking Number",
            "Courier",
            "Shipped At",
            "Delivered At",
        ]
    )

    for seller_order in seller_orders:
        products = ", ".join(
            f"{item.product.name} (x{item.quantity})"
            for item in seller_order.items.all()
        )

        writer.writerow(
            [
                seller_order.order.order_number,
                seller_order.order.created_at.strftime("%Y-%m-%d %H:%M"),
                seller_order.get_status_display(),
                seller_order.order.payment_status,
                seller_order.order.shipping_name,
                products,
                seller_order.subtotal,
                seller_order.shipping_cost,
                seller_order.discount,
                seller_order.tax,
                seller_order.total,
                seller_order.tracking_number,
                seller_order.courier,
                (
                    seller_order.shipped_at.strftime("%Y-%m-%d %H:%M")
                    if seller_order.shipped_at
                    else ""
                ),
                (
                    seller_order.delivered_at.strftime("%Y-%m-%d %H:%M")
                    if seller_order.delivered_at
                    else ""
                ),
            ]
        )

    return response
