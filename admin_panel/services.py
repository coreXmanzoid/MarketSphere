from decimal import Decimal
from datetime import timedelta
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from accounts.models import Address, User, Seller, SellerApplicationDocument
from orders.models import Order, SellerOrder, OrderItem
from products import services
from products.models import Product


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
    store_profile_complete = all([
        seller.store_logo,
        seller.store_banner,
        seller.store_description,
    ])

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
        round((published_products / total_prodcuts) * 100, 1)
        if total_prodcuts
        else 0
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
        total_orders =Coalesce(
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
