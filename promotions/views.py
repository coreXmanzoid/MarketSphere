# =============================================================================
# REPLACES the previous placeholder version -- ADD/UPDATE this in
# products/views.py now that promotions.models.Promotion exists.
#
# Requires: the `promotions` app added to INSTALLED_APPS and migrated.
#
# Still reuses services.filter_products / sort_products / paginate_products
# / get_search_brands / get_wishlist_ids exactly as the main search page
# does -- only the base queryset (which products count as "in this
# promotion") and the price shown per card change.
# =============================================================================

from django.db.models import OuterRef, Subquery
from django.shortcuts import get_object_or_404, render

from accounts.models import Seller
from products.models import Product
from promotions.models import Promotion, PromotionProduct

from products import services as product_services


def promotion_detail(request, promotion_slug):
    promotion = get_object_or_404(Promotion, slug=promotion_slug)

    is_upcoming = promotion.is_upcoming
    is_ended = promotion.is_ended
    is_active = promotion.is_running

    # Products attached to this promotion, still published/sellable.
    # Annotated with promo_price so the product-card price block can
    # prefer the promotion price over the product's own discount_price
    # without a second query per card.
    promo_price_subquery = PromotionProduct.objects.filter(
        promotion=promotion, product=OuterRef("pk")
    ).values("promotion_price")[:1]
    promo_id_subquery = PromotionProduct.objects.filter(
        promotion=promotion, product=OuterRef("pk")
    ).values("id")[:1]

    base_products = (
        Product.objects.select_related("category", "brand")
        .prefetch_related("images")
        .filter(
            status=Product.Status.PUBLISHED,
            seller__status=Seller.Status.VERIFIED,
            promotion_products__promotion=promotion,
        )
        .distinct()
        .annotate(
            promo_price=Subquery(promo_price_subquery),
            promotion_product_id=Subquery(promo_id_subquery),
        )
    )

    product_count = promotion.product_count
    has_any_products = product_count > 0

    category_slugs = request.GET.getlist("category")
    brand_slugs = request.GET.getlist("brand")
    max_price = request.GET.get("max_price")
    availability = request.GET.getlist("availability")
    discount_only = request.GET.get("discount") == "1"
    sort_value = request.GET.get("sort", "newest")
    page_number = request.GET.get("page", 1)

    categories = promotion.get_display_categories()
    brands = product_services.get_search_brands(base_products)

    filtered_products = product_services.filter_products(
        base_products,
        category_slugs=category_slugs,
        brand_slugs=brand_slugs,
        max_price=max_price,
        availability=availability,
        discount_only=discount_only,
    )
    filtered_products = product_services.sort_products_by_price(
        filtered_products, sort_value, price_field="promo_price"
    )

    paginator, page_obj = product_services.paginate_products(filtered_products, page_number)
    pagination_query = request.GET.copy()
    pagination_query.pop("page", None)

    featured_promotion_products = promotion.featured_promotion_products(limit=4)

    context = {
        "promotion": promotion,
        "is_upcoming": is_upcoming,
        "is_active": is_active,
        "is_ended": is_ended,
        "product_count": product_count,
        "has_any_products": has_any_products,
        "featured_promotion_products": featured_promotion_products,
        "products": page_obj,
        "page_obj": page_obj,
        "paginator": paginator,
        "pagination_query": pagination_query,
        "categories": categories,
        "brands": brands,
        "selected_categories": category_slugs,
        "selected_brands": brand_slugs,
        "selected_availability": availability,
        "wishlist_ids": (
            product_services.get_wishlist_ids(request.user)
            if request.user.is_authenticated
            else set()
        ),
    }

    return render(request, "promotion_detail.html", context)
