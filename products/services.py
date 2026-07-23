from .models import Category, Brand, Product, WishlistItem, Cart, CartItem, ProductImage
from django.db.models import Prefetch, Sum
from django.shortcuts import get_object_or_404
from decimal import Decimal, InvalidOperation
from accounts.models import Seller
import json


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
    return (
        Product.objects.select_related("category", "brand")
        .prefetch_related("images")
        .filter(
            status=Product.Status.PUBLISHED,
            is_featured=True,
            seller__status=Seller.Status.VERIFIED,
        )
    )


def get_frequent_products(product):
    return Product.objects.filter(
        category=product.category,
        seller=product.seller,
        status=Product.Status.PUBLISHED,
    ).exclude(id=product.id)[:2]


def get_related_products(product):
    return Product.objects.filter(
        category=product.category,
        seller=product.seller,
        status=Product.Status.PUBLISHED,
    ).exclude(id=product.id)


def get_new_products(limit=8):
    return (
        Product.objects.select_related("category", "brand", "seller")
        .prefetch_related("images")
        .filter(
            status=Product.Status.PUBLISHED,
            seller__status=Seller.Status.VERIFIED,
        )
        .order_by("-created_at")[:limit]
    )


def get_product_by_slug(product_slug):
    return get_object_or_404(
        Product.objects.select_related("category", "brand").prefetch_related("images"),
        slug=product_slug,
        status=Product.Status.PUBLISHED,
    )


def get_edit_product_by_slug(product_slug, seller):
    return get_object_or_404(
        Product.objects.select_related("category", "brand").prefetch_related("images"),
        slug=product_slug,
        seller=seller,
    )


def create_product(user, post_data, files):
    """
    Creates a published product.
    All required fields must be provided.
    """

    required_fields = {
        "name": "Product name",
        "slug": "Slug",
        "category": "Category",
        "price": "Price",
        "stock_quantity": "Stock quantity",
        "min_stock_level": "Minimum stock level",
        "sku": "SKU",
        "short_description": "Short description",
        "description": "Description",
    }

    missing_fields = []

    for field, label in required_fields.items():
        value = nullable(post_data.get(field))
        if value is None:
            missing_fields.append(label)

    images = files.getlist("images")

    if not images:
        missing_fields.append("At least one product image")

    if missing_fields:
        raise ValueError(
            "The following fields are required: " + ", ".join(missing_fields)
        )

    seller = Seller.objects.get(user=user)

    category = Category.objects.get(slug=nullable(post_data.get("category")))

    brand = None
    brand_slug = nullable(post_data.get("brand"))

    if brand_slug:
        brand = Brand.objects.filter(slug=brand_slug).first()

    # Future implementation
    tags = json.loads(post_data.get("tags", "[]"))
    collections = json.loads(post_data.get("collections", "[]"))
    dimensions = json.loads(post_data.get("dimensions", "{}"))

    print(tags)
    print(collections)
    print(dimensions)

    product = Product.objects.create(
        seller=seller,
        category=category,
        brand=brand,
        name=post_data["name"],
        slug=post_data["slug"],
        short_description=post_data["short_description"],
        description=post_data["description"],
        sku=post_data["sku"],
        barcode=nullable(post_data.get("barcode")),
        price=post_data["price"],
        discount_price=nullable(post_data.get("discount_price")),
        stock_quantity=post_data["stock_quantity"],
        min_stock_level=post_data["min_stock_level"],
        weight=nullable(post_data.get("weight")),
        status=Product.Status.PUBLISHED,
        is_featured=post_data.get("is_featured") == "true",
    )

    for index, image in enumerate(images):
        ProductImage.objects.create(
            product=product,
            image=image,
            is_primary=(index == 0),
            display_order=index + 1,
            alt_text=product.name,
        )

    return product


def nullable(value):
    """
    Converts empty or invalid values to None.
    """
    if value in ("", "null", "undefined", None):
        return None
    return value


def save_draft(user, post_data, files):
    """
    Saves a product as a draft.
    Only the product name and slug are required.
    """

    required_fields = {
        "name": "Product name",
        "slug": "Slug",
    }

    missing_fields = []

    for field, label in required_fields.items():
        if not post_data.get(field):
            missing_fields.append(label)

    if missing_fields:
        raise ValueError(
            "The following fields are required: " + ", ".join(missing_fields)
        )

    seller = Seller.objects.get(user=user)

    category = None
    category_slug = nullable(post_data.get("category"))

    if category_slug:
        category = Category.objects.filter(slug=category_slug).first()

    brand = None
    brand_slug = nullable(post_data.get("brand"))

    if brand_slug:
        brand = Brand.objects.filter(slug=brand_slug).first()

    # Future implementation
    tags = json.loads(post_data.get("tags", "[]"))
    collections = json.loads(post_data.get("collections", "[]"))
    dimensions = json.loads(post_data.get("dimensions", "{}"))

    print(tags)
    print(collections)
    print(dimensions)

    product = Product.objects.create(
        seller=seller,
        category=category,
        brand=brand,
        name=post_data["name"],
        slug=post_data["slug"],
        short_description=nullable(post_data.get("short_description")) or "",
        description=nullable(post_data.get("description")) or "",
        sku=nullable(post_data.get("sku")),
        barcode=nullable(post_data.get("barcode")),
        price=nullable(post_data.get("price")),
        discount_price=nullable(post_data.get("discount_price")),
        stock_quantity=nullable(post_data.get("stock_quantity")),
        min_stock_level=nullable(post_data.get("min_stock_level")),
        weight=nullable(post_data.get("weight")),
        status=Product.Status.DRAFT,
        is_featured=post_data.get("is_featured") == "true",
    )

    images = files.getlist("images")

    for index, image in enumerate(images):
        ProductImage.objects.create(
            product=product,
            image=image,
            is_primary=(index == 0),
            display_order=index + 1,
            alt_text=product.name,
        )

    return product


# search logic


def edit_product(seller, product, post_data, files):
    """
    Updates an existing product.
    """

    category = None
    category_slug = nullable(post_data.get("category"))

    if category_slug:
        category = Category.objects.filter(slug=category_slug).first()

    brand = None
    brand_slug = nullable(post_data.get("brand"))

    if brand_slug:
        brand = Brand.objects.filter(slug=brand_slug).first()

    # Future implementation
    tags = json.loads(post_data.get("tags", "[]"))
    collections = json.loads(post_data.get("collections", "[]"))
    dimensions = json.loads(post_data.get("dimensions", "{}"))

    print(tags)
    print(collections)
    print(dimensions)

    product.category = category
    product.brand = brand
    product.name = post_data["name"]
    product.slug = post_data["slug"]
    product.short_description = nullable(post_data.get("short_description")) or ""
    product.description = nullable(post_data.get("description")) or ""
    product.sku = nullable(post_data.get("sku"))
    product.barcode = nullable(post_data.get("barcode"))
    product.price = nullable(post_data.get("price"))
    product.discount_price = nullable(post_data.get("discount_price"))
    product.stock_quantity = nullable(post_data.get("stock_quantity")) or 0
    product.min_stock_level = nullable(post_data.get("min_stock_level")) or 5
    product.weight = nullable(post_data.get("weight"))
    product.is_featured = post_data.get("is_featured") == "true"

    product.save()

    # Delete existing images selected by the user
    deleted_images = json.loads(post_data.get("deleted_images", "[]"))

    if deleted_images:
        ProductImage.objects.filter(
            id__in=deleted_images,
            product=product,
        ).delete()

    # Add newly uploaded images
    images = files.getlist("images")

    current_count = product.images.count()

    for index, image in enumerate(images):

        ProductImage.objects.create(
            product=product,
            image=image,
            is_primary=(current_count == 0 and index == 0),
            display_order=current_count + index + 1,
            alt_text=product.name,
        )

    # Ensure exactly one primary image exists
    primary = product.images.filter(is_primary=True).first()

    if not primary:
        first_image = product.images.order_by("display_order", "id").first()

        if first_image:
            first_image.is_primary = True
            first_image.save(update_fields=["is_primary"])

    return product


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
            status=Product.Status.PUBLISHED,
        )
    )


from django.db.models import Q
from django.db.models.functions import Coalesce
from django.core.paginator import Paginator

# ... keep existing imports/functions ...


def filter_products(
    products,
    category_slugs=None,
    brand_slugs=None,
    max_price=None,
    availability=None,
    discount_only=False,
):
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


def hide_product_by_slug(product_slug, seller):
    product = Product.objects.get(slug=product_slug, seller=seller)
    product.status = Product.Status.HIDDEN
    product.save(update_fields=["status"])


def unhide_product_by_slug(product_slug, seller):
    product = Product.objects.get(slug=product_slug, seller=seller)
    product.status = Product.Status.PUBLISHED
    product.save(update_fields=["status"])


from django.db.models.deletion import ProtectedError


def delete_product_by_slug(product_slug, seller):
    try:
        product = Product.objects.get(
            slug=product_slug,
            seller=seller,
        )

        try:
            product.delete()
            return {
                "success": True,
                "archived": False,
            }

        except ProtectedError:
            product.status = Product.Status.ARCHIVED
            product.save(update_fields=["status"])

            return {
                "success": True,
                "archived": True,
            }

    except Product.DoesNotExist:
        return {
            "success": False,
            "archived": False,
        }


def paginate_products(products, page_number, per_page=12):
    paginator = Paginator(products, per_page)
    return paginator, paginator.get_page(page_number)


def get_search_categories(products):
    return Category.objects.filter(
        products__in=products,
        is_active=True,
    ).distinct()[:5]


def get_search_brands(products):
    return Brand.objects.filter(
        products__in=products,
        is_active=True,
    ).distinct()[:5]


def get_brand_products(brand_slug):
    return (
        Product.objects.select_related("brand", "category")
        .prefetch_related("images")
        .filter(brand__slug=brand_slug, status=Product.Status.PUBLISHED)
    )


def get_category_products(category_slug):
    return (
        Product.objects.select_related("brand", "category")
        .prefetch_related("images")
        .filter(category__slug=category_slug, status=Product.Status.PUBLISHED)
    )


# wishlist logic
def add_to_wishlist(user, product_slug):
    product = get_object_or_404(
        Product, slug=product_slug, status=Product.Status.PUBLISHED
    )
    wishlist_item, created = WishlistItem.objects.get_or_create(
        user=user, product=product
    )

    return wishlist_item


def remove_from_wishlist(user, product_slug):
    wishlist_item = WishlistItem.objects.filter(
        user=user, product__slug=product_slug
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

    return WishlistItem.objects.filter(user=user, product__slug=product_slug).exists()


def get_wishlist_ids(user):
    wishlist_ids = set()

    if user.is_authenticated:
        wishlist_ids = set(
            WishlistItem.objects.filter(user=user).values_list("product_id", flat=True)
        )
        return wishlist_ids
    return None


def get_user_wishlist(user):
    if not getattr(user, "is_authenticated", False):
        return WishlistItem.objects.none()

    return WishlistItem.objects.filter(user=user).select_related(
        "product", "product__brand", "product__category"
    )


def wishlist_count(user):
    if not getattr(user, "is_authenticated", False):
        return 0

    return WishlistItem.objects.filter(user=user).count()


# cart logic


def get_or_create_cart(user):
    cart, created = Cart.objects.get_or_create(user=user)
    return cart


def add_to_cart(user, product_slug):
    product = get_object_or_404(
        Product, slug=product_slug, status=Product.Status.PUBLISHED
    )
    cart = get_or_create_cart(user)

    cart_item, created = CartItem.objects.get_or_create(
        cart=cart, product=product, defaults={"quantity": 1}
    )

    if not created:
        cart_item.quantity = (cart_item.quantity or 0) + 1
        cart_item.save()

    return cart_item


def add_frequently_bought_products(user, body):
    data = json.loads(body)
    product_ids = data.get("products", [])

    cart, _ = Cart.objects.get_or_create(user=user)

    for product_id in product_ids:
        try:
            product = Product.objects.get(
                id=int(product_id),
                status=Product.Status.PUBLISHED,
            )

            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={
                    "quantity": 1,
                },
            )

            if not created:
                cart_item.quantity += 1
                cart_item.save(update_fields=["quantity", "updated_at"])

        except (Product.DoesNotExist, ValueError, TypeError):
            continue

    return cart


def update_recently_viewed_products(request, product):
    recently_viewed = request.session.get("recently_viewed", [])

    if product.id in recently_viewed:
        recently_viewed.remove(product.id)

    recently_viewed.insert(0, product.id)

    recently_viewed = recently_viewed[:10]

    request.session["recently_viewed"] = recently_viewed
    request.session.modified = True


def get_recently_viewed_products(request, current_product, limit=8):
    recently_viewed_ids = request.session.get("recently_viewed", [])

    products = list(
        Product.objects.select_related("category", "brand", "seller")
        .prefetch_related("images")
        .filter(
            id__in=recently_viewed_ids,
            status=Product.Status.PUBLISHED,
            seller__status=Seller.Status.VERIFIED,
        )
        .exclude(id=current_product.id)
    )

    products.sort(
        key=lambda product: recently_viewed_ids.index(product.id)
    )

    return products[:limit]

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
        product=get_object_or_404(
            Product, slug=product_slug, status=Product.Status.PUBLISHED
        ),
        defaults={"quantity": 1},
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
    items = CartItem.objects.filter(cart=cart).select_related("product")
    total = Decimal("0.00")
    for item in items:
        price = getattr(item.product, "discount_price", None) or getattr(
            item.product, "price", Decimal("0.00")
        )
        total += Decimal(price) * Decimal(item.quantity or 0)
    return total


def cart_subtotal(user):
    # same as total for now (no taxes/shipping applied here)
    return cart_total(user)


def cart_count(user):
    cart = get_or_create_cart(user)
    return (
        CartItem.objects.filter(cart=cart).aggregate(total_quantity=Sum("quantity"))[
            "total_quantity"
        ]
        or 0
    )


def get_user_cart(user):
    if not getattr(user, "is_authenticated", False):
        return None

    cart = Cart.objects.filter(user=user).prefetch_related("items__product").first()
    return cart
