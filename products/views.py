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


def search(request):
    q = request.GET.get("q", "").strip()

    products = services.get_search_products(q)

    categories = services.get_search_categories(products)

    brands = services.get_search_brands(products)

    context = {
        "q": q,
        "products": products,
        "categories": categories,
        "brands": brands,
    }

    return render(
        request,
        "search_results.html",
        context,
    )

def category_search(request, category_slug):
    category_products = services.get_category_products(category_slug)
    brands = services.get_all_brands()
    return render(
        request,
        "search_results.html",
        {"categories": None, "brnads": brands, "products": category_products},
    )


def brand_search(request, brand_slug):
    brand_products = services.get_brand_products(brand_slug)
    brands = services.get_all_brands()
    categories = services.get_all_categories()
    return render(
        request,
        "search_results.html",
        {"categories": categories, "brnads": None, "products": brand_products},
    )


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
