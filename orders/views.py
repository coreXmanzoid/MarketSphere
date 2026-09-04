import json
import logging

from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.http import JsonResponse, FileResponse
from django.shortcuts import render, get_object_or_404

from accounts import services as account_service
from accounts.models import Seller
from products import services as cart_service

from . import services as order_service
from .invoice import generate_invoice
from .models import Order
from .packing_slip import generate_packing_slip
from .shipping_label import generate_shipping_label

logger = logging.getLogger(__name__)


def orders(request):
    orders = order_service.get_user_orders(request.user)
    paginator = Paginator(orders, 10)
    page_obj = paginator.get_page(request.GET.get("page", 1))

    query_params = request.GET.copy()
    query_params.pop("page", None)
    context = {
        "orders": page_obj,
        "page_obj": page_obj,
        "paginator": paginator,
        "pagination_query": query_params,
    }
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
                "message": "Invalid request method.",
            },
            status=400,
        )
    try:
        data = json.loads(request.body)

        created_orders = order_service.place_order(
            user=request.user,
            address_id=data["addressId"],
            full_name=data.get("fullName"),
            email=data.get("email"),
            phone=data.get("phone"),
            notes=data.get("notes", ""),
        )

        # Assuming standard checkout redirects to a single order confirmation.
        # Grabbing the first order's number if multiple sellers were involved.
        primary_order_number = created_orders[0].order_number if created_orders else ""

        return JsonResponse(
            {
                "status": "success",
                "orderNumber": primary_order_number,
            }
        )

    except Exception as e:
        logger.exception("Order placement failed")

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
def update_shipping(request, order_number):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request."
            },
            status=405
        )

    order = get_object_or_404(
        Order,
        order_number=order_number,
        seller=request.user.seller_profile,
    )

    order_service.update_shipping_information(
        order,
        request.POST,
    )

    return JsonResponse(
        {
            "success": True,
            "message": "Shipping information updated successfully.",
            "courier": order.courier,
            "tracking_number": order.tracking_number,
            "estimated_delivery": order.estimated_delivery,
            "shipping_notes": order.shipping_notes,
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


@login_required
def download_invoice(request, order_number):
    seller = get_object_or_404(Seller, user=request.user)

    order = get_object_or_404(
        Order.objects.select_related("user", "seller").prefetch_related(
            "items__product"
        ),
        order_number=order_number,
        seller=seller,
    )

    pdf_buffer = generate_invoice(order)

    return FileResponse(
        pdf_buffer,
        as_attachment=False,
        filename=f"invoice-{order.order_number}.pdf",
        content_type="application/pdf",
    )


def update_seller_note_view(request, order_number):
    try:
        data = json.loads(request.body)
        note = data.get("note", "").strip()
        seller = request.user.seller_profile

        success = order_service.update_seller_note(
            seller=seller, 
            order_number=order_number, 
            note=note
        )

        if success:
            return JsonResponse({
                "success": True, 
                "message": "Seller note updated successfully."
            })
        else:
            return JsonResponse({
                "success": False, 
                "message": "Order not found or you do not have permission to modify it."
            }, status=404)

    except json.JSONDecodeError:
        return JsonResponse({
            "success": False, 
            "message": "Invalid JSON data provided."
        }, status=400)
    except AttributeError:
        return JsonResponse({
            "success": False, 
            "message": "User does not have an associated seller profile."
        }, status=403)
    except Exception as e:
        return JsonResponse({
            "success": False, 
            "message": "An unexpected error occurred."
        }, status=500)
    

@login_required
def download_shipping_label(request, order_number):
    seller = get_object_or_404(Seller, user=request.user)

    order = get_object_or_404(
        Order.objects.select_related("user", "seller").prefetch_related(
            "items__product"
        ),
        order_number=order_number,
        seller=seller,
    )

    pdf_buffer = generate_shipping_label(order)

    return FileResponse(
        pdf_buffer,
        as_attachment=False,
        filename=f"shipping-label-{order.order_number}.pdf",
        content_type="application/pdf",
    )


@login_required
def download_packing_slip(request, order_number):
    seller = get_object_or_404(Seller, user=request.user)

    order = get_object_or_404(
        Order.objects.select_related("user", "seller").prefetch_related(
            "items__product"
        ),
        order_number=order_number,
        seller=seller,
    )

    pdf_buffer = generate_packing_slip(order)

    return FileResponse(
        pdf_buffer,
        as_attachment=False,
        filename=f"packing-slip-{order.order_number}.pdf",
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
