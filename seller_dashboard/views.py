from django.shortcuts import render
from accounts.decorators import verified_seller
from products.services import (
    create_product,
    hide_product_by_slug,
    unhide_product_by_slug,
    delete_product_by_slug,
    save_draft,
    edit_product,
    get_edit_product_by_slug
)
from orders.services import get_user_order_for_seller, update_order_status
import json
# Create your views here.


def dashboard(request):
    seller = request.user.seller_profile
    context = {}
    return render(request, "dashboard.html", context)


def products(request):
    return render(request, "products/list.html")


from django.http import JsonResponse


def add_product(request):

    if request.method == "POST":

        product = create_product(
            request.user,
            request.POST,
            request.FILES,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Product created successfully.",
                "product_id": product.id,
            }
        )
    return render(request, "products/create.html")


def draft_product(request):

    if request.method == "POST":

        product = save_draft(
            request.user,
            request.POST,
            request.FILES,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Product created successfully.",
                "product_id": product.id,
            }
        )
    return render(request, "products/create.html")


def edit_products(request, product_slug):

    product = get_edit_product_by_slug(product_slug, request.user.seller_profile)

    if request.method == "POST":

        product = edit_product(
            request.user.seller_profile,
            product,
            request.POST,
            request.FILES,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Product updated successfully.",
                "product_id": product.id,
            }
        )

    context = {
        "product": product,
    }

    return render(
        request,
        "products/edit.html",
        context,
    )


def hide_product(request):
    try:
        data = json.loads(request.body)
        product_slug = data.get("productSlug")
        hide_product_by_slug(product_slug, request.user.seller_profile)
        return JsonResponse(
            {
                "status": "success",
                "message": "The product has been hidden successfully.",
            }
        )

    except Exception:
        return JsonResponse(
            {"status": "error", "message": "Something went wrong."}, status=400
        )


def unhide_product(request):
    try:
        data = json.loads(request.body)
        product_slug = data.get("productSlug")
        unhide_product_by_slug(product_slug, request.user.seller_profile)
        return JsonResponse(
            {
                "status": "success",
                "message": "The product has been unhidden successfully.",
            }
        )

    except Exception:
        return JsonResponse(
            {"status": "error", "message": "Something went wrong."}, status=400
        )


def delete_product(request):
    data = json.loads(request.body)
    product_slug = data.get("productSlug")
    result = delete_product_by_slug(
        product_slug,
        request.user.seller_profile,
    )
    print(result)

    if result["success"]:
        return JsonResponse(
            {
                "status": "success",
                "archived": result["archived"],
                "message": (
                    "Product deleted successfully."
                    if not result["archived"]
                    else "Product has previous orders, so it was archived instead."
                ),
            }
        )

    return JsonResponse(
        {
            "status": "error",
            "message": "Product not found.",
        },
        status=404,
    )


def orders(request):
    return render(request, "orders/list.html")

def order_detail(request, order_no):
    order = get_user_order_for_seller(request.user.seller_profile, order_no)

    return render(request, "orders/detail.html", {"order": order})


def update_user_order_status(request, order_no, status):
    update_order_status(
        request.user.seller_profile,
        order_no,
        status,
    )

    return JsonResponse({
        "success": True,
        "status": status,
    })


def dashboard_settings(request):
    seller = request.user.seller_profile
    return render(request, "settings.html", {"seller": seller})