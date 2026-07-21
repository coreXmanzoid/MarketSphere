from django.shortcuts import render, redirect
from accounts import services as account_service
from products import services as cart_service
from django.http import JsonResponse
from . import services as order_service
from django.contrib.auth.decorators import login_required
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from .invoice import generate_invoice
from .shipping_label import generate_shipping_label
from .packing_slip import generate_packing_slip
from .models import Order

import json

# Create your views here.


def orders(request):
    orders = order_service.get_user_orders(request.user)

    context = {"orders": orders}
    return render(request, "orders.html", context)


def order(request, order_number):
    order = order_service.get_user_order(request.user, order_number)
    context = {"order": order}
    return render(request, "order_detail.html", context)


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

from orders.services import update_shipping_information


@login_required
def update_shipping(request, order_number):

    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request."
            },
            status=405
        )

    seller_order = get_object_or_404(
        SellerOrder,
        order__order_number=order_number,
        seller=request.user.seller_profile,
    )

    update_shipping_information(
        seller_order,
        request.POST,
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Shipping information updated successfully.",
            "courier": seller_order.courier,
            "tracking_number": seller_order.tracking_number,
            "estimated_delivery": seller_order.estimated_delivery,
            "shipping_notes": seller_order.shipping_notes,
        }
    )


@login_required
def order_cancelation(request, order_number):
    is_canceled = order_service.cancel_user_order(request.user, order_number)
    if is_canceled:
        return JsonResponse(
            {
                "status": "success",
                "message": "Your order has been successfully Canceled.",
            }
        )
    return JsonResponse(
        {
            "status": "error",
            "message": "The order can't be canceled due to a hard reason.",
        }
    )
from django.contrib.auth.decorators import login_required
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from accounts.models import Seller
from .invoice import generate_invoice
from .models import SellerOrder


@login_required
def download_invoice(request, order_number):
    # 1. Get the seller record associated with the logged-in user
    seller = get_object_or_404(Seller, user=request.user)

    # 2. Query the SellerOrder matching this order_number and seller,
    # optimizing DB queries with select_related and prefetch_related
    seller_order = get_object_or_404(
        SellerOrder.objects.select_related("order", "seller").prefetch_related(
            "items__product"
        ),
        order__order_number=order_number,
        seller=seller,
    )

    # 3. Pass the SellerOrder object into the invoice generator
    pdf_buffer = generate_invoice(seller_order)

    # 4. Stream the generated PDF response back to the client
    return FileResponse(
        pdf_buffer,
        as_attachment=False,
        filename=f"invoice-{seller_order.order.order_number}.pdf",
        content_type="application/pdf",
    )


@login_required
def download_shipping_label(request, order_number):
    # 1. Get the seller record associated with the logged-in user
    seller = get_object_or_404(Seller, user=request.user)

    # 2. Query the SellerOrder matching this order_number and seller,
    # optimizing DB queries with select_related and prefetch_related
    seller_order = get_object_or_404(
        SellerOrder.objects.select_related("order", "seller").prefetch_related(
            "items__product"
        ),
        order__order_number=order_number,
        seller=seller,
    )

    # 3. Pass the SellerOrder object into the invoice generator
    pdf_buffer = generate_shipping_label(seller_order)

    # 4. Stream the generated PDF response back to the client
    return FileResponse(
        pdf_buffer,
        as_attachment=False,
        filename=f"packing-slip-{seller_order.order.order_number}.pdf",
        content_type="application/pdf",
    )

@login_required
def download_packing_slip(request, order_number):
    # 1. Get the seller record associated with the logged-in user
    seller = get_object_or_404(Seller, user=request.user)

    # 2. Query the SellerOrder matching this order_number and seller,
    # optimizing DB queries with select_related and prefetch_related
    seller_order = get_object_or_404(
        SellerOrder.objects.select_related("order", "seller").prefetch_related(
            "items__product"
        ),
        order__order_number=order_number,
        seller=seller,
    )

    # 3. Pass the SellerOrder object into the invoice generator
    pdf_buffer = generate_packing_slip(seller_order)

    # 4. Stream the generated PDF response back to the client
    return FileResponse(
        pdf_buffer,
        as_attachment=False,
        filename=f"packing-slip-{seller_order.order.order_number}.pdf",
        content_type="application/pdf",
    )

@login_required
def reorder(request, order_number):
    order = order_service.reorder_user_order(request.user, order_number)
    if order:
        return JsonResponse(
            {
                "status": "success",
                "message": "order has successfully added to cart. See your cart",
            }
        )
    return JsonResponse(
        {
            "status": "error",
            "message": "There is a problem while reordering your order.",
        }
    )
