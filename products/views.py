from django.shortcuts import render
from . import services
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse


# Create your views here.
def home(request):
    categories = services.get_all_categories()
    brands = services.get_all_brands()
    featured_products = services.get_featured_products()
    context = {
        "categories": categories,
        "brands": brands,
        "featured_products": featured_products,
        "wishlist_ids": services.get_wishlist_ids(request.user),
    }
    return render(request, "home.html", context)


from django.shortcuts import render
from django.http import JsonResponse

from . import services

def search(request):
    q = request.GET.get("q", "").strip()
    category_slugs = request.GET.getlist("category")
    brand_slugs = request.GET.getlist("brand")
    max_price = request.GET.get("max_price")
    availability = request.GET.getlist("availability")
    discount_only = request.GET.get("discount") == "1"
    sort_value = request.GET.get("sort", "newest")
    page_number = request.GET.get("page", 1)

    # Base set: query only. Sidebar options are computed from THIS,
    # so the sidebar doesn't shrink as filters are applied.
    base_products = services.get_search_products(q)
    categories = services.get_search_categories(base_products)
    brands = services.get_search_brands(base_products)

    # Full set: query + every active filter, for the actual grid.
    filtered_products = services.filter_products(
        base_products,
        category_slugs=category_slugs,
        brand_slugs=brand_slugs,
        max_price=max_price,
        availability=availability,
        discount_only=discount_only,
    )
    filtered_products = services.sort_products(filtered_products, sort_value)

    paginator, page_obj = services.paginate_products(filtered_products, page_number)

    context = {
        "q": q,
        "products": page_obj,          # Page objects support |length and iteration
        "page_obj": page_obj,
        "paginator": paginator,
        "categories": categories,
        "brands": brands,
        "wishlist_ids": services.get_wishlist_ids(request.user) if request.user.is_authenticated else set(),
    }

    return render(request, "search_results.html", context)


from products.models import Category


def search_categories(request):

    query = request.GET.get("q", "")

    categories = (
        Category.objects
        .filter(name__icontains=query)
        .order_by("name")[:10]
    )

    return JsonResponse({
        "categories": [
            {
                "name": category.name,
                "slug": category.slug,
            }
            for category in categories
        ]
    })

from django.http import JsonResponse

from products.models import Brand


def search_brands(request):

    query = request.GET.get("q","")

    brands = Brand.objects.filter(
        name__icontains=query
    ).order_by("name")[:10]

    data = []

    for brand in brands:

        data.append({

            "slug":brand.slug,
            "name":brand.name,

        })

    return JsonResponse({

        "brands":data

    })

def product(request, product_slug):
    product = services.get_product_by_slug(product_slug)
    context = {
        "product": product,
        "is_in_wishlist": (
            services.is_in_wishlist(request.user, product.slug)
            if request.user.is_authenticated
            else False
        ),
    }
    return render(request, "product_details.html", context)


@login_required
def wishlist(request):
    wishlist_items = services.get_user_wishlist(request.user)

    context = {
        "wishlist_products": wishlist_items,
        "wishlist_count": services.wishlist_count(request.user),
    }

    return render(request, "wishlist.html", context)


@login_required
def toggle_wishlist(request, product_slug):
    is_added = services.toggle_wishlist(request.user, product_slug)

    return JsonResponse(
        {
            "success": True,
            "is_added": is_added,
            "wishlist_count": services.wishlist_count(request.user),
        }
    )


@login_required
def cart(request):
    cart = services.get_user_cart(request.user)

    context = {
        "cart": cart,
        "cart_count": services.cart_count(request.user),
        "subtotal": services.cart_subtotal(request.user),
        "total": services.cart_total(request.user),
    }

    return render(request, "cart.html", context)


@login_required
def add_to_cart(request, product_slug):
    cart_item = services.add_to_cart(request.user, product_slug)

    return JsonResponse(
        {
            "success": True,
            "quantity": cart_item.quantity,
            "cart_count": services.cart_count(request.user),
            "subtotal": str(services.cart_subtotal(request.user)),
            "total": str(services.cart_total(request.user)),
        }
    )


@login_required
def remove_from_cart(request, product_slug):
    success = services.remove_from_cart(request.user, product_slug)

    return JsonResponse(
        {
            "success": success,
            "cart_count": services.cart_count(request.user),
            "subtotal": str(services.cart_subtotal(request.user)),
            "total": str(services.cart_total(request.user)),
        }
    )


@login_required
def increment_quantity(request, product_slug):
    print("esssss")
    cart_item = services.increment_quantity(request.user, product_slug)

    return JsonResponse(
        {
            "success": True,
            "quantity": cart_item.quantity,
            "item_subtotal": str(cart_item.subtotal),
            "cart_count": services.cart_count(request.user),
            "subtotal": str(services.cart_subtotal(request.user)),
            "total": str(services.cart_total(request.user)),
        }
    )


@login_required
def decrement_quantity(request, product_slug):
    cart_item = services.decrement_quantity(request.user, product_slug)

    if cart_item is None:
        return JsonResponse(
            {
                "success": True,
                "removed": True,
                "cart_count": services.cart_count(request.user),
                "subtotal": str(services.cart_subtotal(request.user)),
                "total": str(services.cart_total(request.user)),
            }
        )

    return JsonResponse(
        {
            "success": True,
            "removed": False,
            "quantity": cart_item.quantity,
            "item_subtotal": str(cart_item.subtotal),
            "cart_count": services.cart_count(request.user),
            "subtotal": str(services.cart_subtotal(request.user)),
            "total": str(services.cart_total(request.user)),
        }
    )


@login_required
def update_quantity(request, product_slug):
    import json

    quantity = json.loads(request.body or b"{}").get("quantity")
    cart_item = services.update_quantity(
        request.user,
        product_slug,
        quantity,
    )

    if cart_item is None:
        return JsonResponse(
            {
                "success": True,
                "removed": True,
                "cart_count": services.cart_count(request.user),
                "subtotal": str(services.cart_subtotal(request.user)),
                "total": str(services.cart_total(request.user)),
            }
        )

    return JsonResponse(
        {
            "success": True,
            "removed": False,
            "quantity": cart_item.quantity,
            "item_subtotal": str(cart_item.subtotal),
            "cart_count": services.cart_count(request.user),
            "subtotal": str(services.cart_subtotal(request.user)),
            "total": str(services.cart_total(request.user)),
        }
    )


@login_required
def clear_cart(request):
    services.clear_cart(request.user)

    return JsonResponse(
        {
            "success": True,
            "cart_count": 0,
            "subtotal": "0.00",
            "total": "0.00",
        }
    )


@login_required
def cart_data(request):
    cart = services.get_user_cart(request.user)

    return JsonResponse(
        {
            "cart": cart,
            "cart_count": services.cart_count(request.user),
            "subtotal": str(services.cart_subtotal(request.user)),
            "total": str(services.cart_total(request.user)),
        }
    )
