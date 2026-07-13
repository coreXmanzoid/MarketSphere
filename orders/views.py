from django.shortcuts import render, redirect
from accounts import services as account_service
from products import services as cart_service
from django.http import JsonResponse
from . import services as order_service
from django.contrib.auth.decorators import login_required
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from .invoice import generate_invoice
from .models import Order

import json

# Create your views here.

def orders(request):
    orders = order_service.get_user_orders(request.user)

    context = {
        "orders": orders
    }
    return render(request, "orders.html", context)

def order(request, order_number):
    order = order_service.get_user_order(request.user, order_number)
    context = {
        "order": order
    }
    return render(request,  "order_detail.html", context)

def checkout(request):
    addresses = account_service.get_user_addresses(request.user)
    cart = cart_service.get_user_cart(request.user)
    context = {
        "addresses": addresses,
        "cart": cart,
        "subtotal": cart_service.cart_subtotal(request.user),
        "total": cart_service.cart_subtotal(request.user),
    }
    return render(request, "checkout.html", context)


@login_required
def place_new_order(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )
    try:
        data = json.loads(request.body)

        order = order_service.place_order(
            user=request.user,
            address_id=data["addressId"],
            full_name=data.get("fullName"),
            email=data.get("email"),
            phone=data.get("phone"),
            notes=data.get("notes", ""),
        )

        return JsonResponse(
            {
                "status": "success",
                "orderNumber": order.order_number,
            }
        )

    except Exception as e:
        print(type(e))
        print(repr(e))

        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )

@login_required
def order_confirmation(request, order_number):

    order = order_service.get_user_order(request.user, order_number)

    return render(
        request,
        "confirmation.html",
        {
            "order": order,
        },
    )

@login_required
def order_cancelation(request, order_number):
    is_canceled = order_service.cancel_user_order(request.user, order_number)
    if is_canceled:
        return JsonResponse({
            "status" : "success",
            "message": "Your order has been successfully Canceled."
        })
    return JsonResponse({
        "status": "error",
        "message" : "The order can't be canceled due to a hard reason."
    })


@login_required
def download_invoice(request, order_number):
    order = get_object_or_404(
        Order.objects.prefetch_related("items__product"),
        order_number=order_number,
        user=request.user,
    )

    pdf_buffer = generate_invoice(order)

    return FileResponse(
        pdf_buffer,
        as_attachment=False,
        filename=f"invoice-{order.order_number}.pdf",
        content_type="application/pdf",
    )

@login_required
def reorder(request, order_number):
    order = order_service.reorder_user_order(request.user, order_number)
    if order:
        return JsonResponse({
            'status': 'success',
            'message': 'order has successfully added to cart. See your cart',
        })
    return JsonResponse({
            'status': 'error',
            'message': 'There is a problem while reordering your order.'
        })
    