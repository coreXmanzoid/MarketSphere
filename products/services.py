from .models import Category, Brand, Product, WishlistItem, Cart, CartItem
from django.db.models import Prefetch, Sum
from django.shortcuts import get_object_or_404
from decimal import Decimal, InvalidOperation


def get_all_categories():

    categories = Category.objects.filter(parent=None, is_active=True).prefetch_related(
        Prefetch(
            "children",
            queryset=Category.objects.filter(is_active=True).prefetch_related(
                Prefetch(
                    "children",
                    queryset=Category.objects.filter(is_active=True),
                )
            ),
        )
    )
    return categories

def get_all_brands():
    brands = Brand.objects.filter(is_active=True)
    return brands

def get_featured_products():
    return Product.objects.select_related(
        "category",
        "brand"
    ).prefetch_related(
        "images"
    ).filter(
        is_active=True,
        is_featured=True
    )

def get_product_by_slug(product_slug):
    return get_object_or_404(
        Product.objects.select_related(
            "category",
            "brand"
        ).prefetch_related(
            "images"
        ),
        slug=product_slug,
        is_active=True
    )


# search logic

from django.db.models import Q

def get_search_products(q):
    if not q:
        return Product.objects.all()

    return (
        Product.objects.select_related(
            "category",
            "brand",
        )
        .prefetch_related("images")
        .filter(
            Q(name__icontains=q)
            | Q(short_description__icontains=q)
            | Q(description__icontains=q),
            is_active=True,
        )
    )

from django.db.models import Q
from django.db.models.functions import Coalesce
from django.core.paginator import Paginator

# ... keep existing imports/functions ...

def filter_products(products, category_slugs=None, brand_slugs=None,
                     max_price=None, availability=None, discount_only=False):
    if category_slugs:
        products = products.filter(category__slug__in=category_slugs)

    if brand_slugs:
        products = products.filter(brand__slug__in=brand_slugs)

    if max_price:
        try:
            max_price = Decimal(max_price)
            products = products.filter(
                Q(discount_price__isnull=False, discount_price__lte=max_price)
                | Q(discount_price__isnull=True, price__lte=max_price)
            )
        except (InvalidOperation, TypeError):
            pass  # ignore malformed price param rather than 500ing

    if availability:
        avail_q = Q()
        if "in_stock" in availability:
            avail_q |= Q(stock_quantity__gt=0)
        if "out_of_stock" in availability:
            avail_q |= Q(stock_quantity=0)
        if avail_q:
            products = products.filter(avail_q)

    if discount_only:
        products = products.filter(discount_price__isnull=False)

    # NOTE: rating_min is sent by the frontend but there's no Review/rating
    # model yet, so it's a no-op for now — add a filter here once one exists.

    return products


def sort_products(products, sort_value):
    effective_price = Coalesce("discount_price", "price")

    if sort_value == "price_low_high":
        return products.order_by(effective_price)
    if sort_value == "price_high_low":
        return products.order_by(effective_price.desc())
    if sort_value == "popularity":
        # NOTE: no popularity/sold-count field yet — falls back to newest
        # until one is added (e.g. an order-count annotation).
        return products.order_by("-created_at")

    return products.order_by("-created_at")  # "newest" / default


def paginate_products(products, page_number, per_page=12):
    paginator = Paginator(products, per_page)
    return paginator, paginator.get_page(page_number)

def get_search_categories(products):
    return (
        Category.objects.filter(
            products__in=products,
            is_active=True,
        )
        .distinct()[:5]
    )


def get_search_brands(products):
    return (
        Brand.objects.filter(
            products__in=products,
            is_active=True,
        )
        .distinct()[:5]
    )

def get_brand_products(brand_slug):
    return Product.objects.select_related(
        "brand",
        "category"
    ).prefetch_related(
        "images"
    ).filter(
        brand__slug=brand_slug,
        is_active=True
    )
def get_category_products(category_slug):
    return Product.objects.select_related(
        "brand",
        "category"
    ).prefetch_related(
        "images"
    ).filter(
        category__slug=category_slug,
        is_active=True
    )

# wishlist logic
def add_to_wishlist(user, product_slug):
    product = get_object_or_404(Product, slug=product_slug, is_active=True)
    wishlist_item, created = WishlistItem.objects.get_or_create(
        user=user,
        product=product
    )

    return wishlist_item


def remove_from_wishlist(user, product_slug):
    wishlist_item = WishlistItem.objects.filter(
        user=user,
        product__slug=product_slug
    ).first()

    if wishlist_item:
        wishlist_item.delete()
        return True

    return False


def toggle_wishlist(user, product_slug):
    if is_in_wishlist(user, product_slug):
        remove_from_wishlist(user, product_slug)
        return False

    add_to_wishlist(user, product_slug)
    return True


def is_in_wishlist(user, product_slug):
    if not getattr(user, "is_authenticated", False):
        return False

    return WishlistItem.objects.filter(
        user=user,
        product__slug=product_slug
    ).exists()


def get_wishlist_ids(user):
    wishlist_ids = set()

    if user.is_authenticated:
        wishlist_ids = set(
            WishlistItem.objects.filter(user=user)
            .values_list("product_id", flat=True)
        )
        return wishlist_ids
    return None

def get_user_wishlist(user):
    if not getattr(user, "is_authenticated", False):
        return WishlistItem.objects.none()

    return WishlistItem.objects.filter(user=user).select_related(
        "product",
        "product__brand",
        "product__category"
    )


def wishlist_count(user):
    if not getattr(user, "is_authenticated", False):
        return 0

    return WishlistItem.objects.filter(user=user).count()

# cart logic

def get_or_create_cart(user):
    cart, created =  Cart.objects.get_or_create(user = user)
    return cart

def add_to_cart(user, product_slug):
    product = get_object_or_404(Product, slug=product_slug, is_active=True)
    cart = get_or_create_cart(user)

    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=product,
        defaults={"quantity": 1}
    )

    if not created:
        cart_item.quantity = (cart_item.quantity or 0) + 1
        cart_item.save()

    return cart_item

def remove_from_cart(user, product_slug):
    cart = get_or_create_cart(user)
    cart_item = CartItem.objects.filter(cart=cart, product__slug=product_slug).first()
    if cart_item:
        cart_item.delete()
        return True
    return False

def update_quantity(user, product_slug, quantity):
    cart = get_or_create_cart(user)
    cart_item = CartItem.objects.filter(cart=cart, product__slug=product_slug).first()
    if not cart_item:
        return None

    try:
        qty = int(quantity)
    except (TypeError, ValueError):
        return None

    if qty <= 0:
        cart_item.delete()
        return None

    cart_item.quantity = qty
    cart_item.save()
    return cart_item

def increment_quantity(user, product_slug):
    cart = get_or_create_cart(user)
    cart_item, created = CartItem.objects.get_or_create(
        cart=cart,
        product=get_object_or_404(Product, slug=product_slug, is_active=True),
        defaults={"quantity": 1}
    )

    if not created:
        cart_item.quantity = (cart_item.quantity or 0) + 1
        cart_item.save()

    return cart_item

def decrement_quantity(user, product_slug):
    cart = get_or_create_cart(user)
    cart_item = CartItem.objects.filter(cart=cart, product__slug=product_slug).first()
    if not cart_item:
        return None

    if (cart_item.quantity or 0) <= 1:
        cart_item.delete()
        return None

    cart_item.quantity = cart_item.quantity - 1
    cart_item.save()
    return cart_item

def clear_cart(user):
    cart = get_or_create_cart(user)
    CartItem.objects.filter(cart=cart).delete()
    return True

def cart_total(user):
    cart = get_or_create_cart(user)
    items = CartItem.objects.filter(cart=cart).select_related('product')
    total = Decimal('0.00')
    for item in items:
        price = (
        getattr(item.product, "discount_price", None)
        or getattr(item.product, "price", Decimal("0.00"))
        )
        total += (Decimal(price) * Decimal(item.quantity or 0))
    return total

def cart_subtotal(user):
    # same as total for now (no taxes/shipping applied here)
    return cart_total(user)


def cart_count(user):
    cart = get_or_create_cart(user)
    return (
        CartItem.objects.filter(cart=cart)
        .aggregate(total_quantity=Sum("quantity"))["total_quantity"]
        or 0
    )

def get_user_cart(user):
    if not getattr(user, 'is_authenticated', False):
        return None

    cart = Cart.objects.filter(user=user).prefetch_related('items__product').first()
    return cart