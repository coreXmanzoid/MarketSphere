from django.db.models import Sum, Q
from django.db.models.functions import Coalesce
from decimal import Decimal

from django.http import JsonResponse
from django.shortcuts import render
from accounts import services as account_services
from accounts.models import User, Address
from orders.models import Order
from django.contrib import messages
from django.core.paginator import Paginator

# Create your views here.
def dashboard(request):
    
    return render(request, "admin_dashboard.html")


def user_management(request):
    return render(request, "user_management/overview.html")


def user_buyers(request):
    total_buyers = account_services.get_all_buyers().annotate(
        total_spent=Coalesce(
            Sum(
                "orders__total",
                filter=Q(orders__payment_status=Order.PaymentStatus.PAID),
            ),
            Decimal("0.00"),
        )
    )
    paginator = Paginator(total_buyers.order_by("-date_joined"), 8)
    page_obj = paginator.get_page(request.GET.get("page", 1))
    query_params = request.GET.copy()
    query_params.pop("page", None)
    return render(request, "user_management/buyer/buyers.html", {
        "buyers": page_obj,
        "page_obj": page_obj,
        "paginator": paginator,
        "pagination_query": query_params,
    })


def user_buyer(request, userId):
    context = services.get_buyer_details(userId)

    return render(
        request,
        "user_management/buyer/buyer_detail.html",
        context,
    )


def user_sellers(request):
    total_sellers = account_services.get_all_sellers()
    paginator = Paginator(total_sellers.order_by("-created_at"), 8)
    page_obj = paginator.get_page(request.GET.get("page", 1))
    query_params = request.GET.copy()
    query_params.pop("page", None)

    return render(
        request, "user_management/seller/seller.html", {
            "sellers": page_obj,
            "page_obj": page_obj,
            "paginator": paginator,
            "pagination_query": query_params,
        }
    )

def user_seller(request, sellerId):
    context = services.get_seller_detail(sellerId)
    return render(request, "user_management/seller/detail.html", context)

def catalog_products(request):
    context = services.get_products_catalog()
    paginator = Paginator(context["products"].order_by("-created_at"), 6)
    page_obj = paginator.get_page(request.GET.get("page", 1))
    query_params = request.GET.copy()
    query_params.pop("page", None)
    context.update({
        "products": page_obj,
        "page_obj": page_obj,
        "paginator": paginator,
        "pagination_query": query_params,
    })
    return render(request, "catalog/products_management/products.html", context=context)


def seller_application(request, sellerId):
    context = services.get_pending_seller(sellerId)
    return render(request, "user_management/seller/application.html", context)

def change_state(request):
    if request.method == "POST":
        user_id = request.POST.get("userId")
        state = request.POST.get("state")
        print(user_id, state)
        account_services.change_account_state(user_id, state)
        return JsonResponse({"status": "success"})
    return JsonResponse({"status": "invalid request"})





import json
def reject_seller_application(request, application_id):
    print("hi")
    try:
        payload = json.loads(request.body)

        account_services.reject_seller_application_service(
            application_id=application_id,
            reason=payload.get("reason"),
            notes=payload.get("notes"),
        )

        return JsonResponse({
            "success": True,
            "message": "Application rejected successfully.",
        })

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )


from django.views.decorators.http import require_POST


@require_POST
def request_application_changes(request, application_id):

    try:
        payload = json.loads(request.body)

        account_services.request_application_changes_service(
            application_id=application_id,
            requested_changes=payload.get("requested_changes", []),
            notes=payload.get("notes", ""),
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Change request sent successfully.",
            }
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

from django.http import JsonResponse
from django.views.decorators.http import require_POST


@require_POST
def approve_seller_application(request, application_id):

    try:

        account_services.approve_seller_application_service(
            application_id=application_id,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Seller application approved successfully.",
            }
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

from django.http import JsonResponse
from django.views.decorators.http import require_POST


@require_POST
def delete_seller_application(request, seller_id):
    try:

        account_services.delete_seller_account_service(seller_id)

        return JsonResponse(
            {
                "success": True,
                "message": "Seller account deleted successfully.",
            }
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

import json

from django.http import JsonResponse


def flag_seller_document(request, document_id):

    try:

        payload = json.loads(request.body)

        account_services.flag_seller_document_service(
            document_id=document_id,
            issue=payload.get("issue"),
            note=payload.get("note"),
        )

        return JsonResponse({
            "success": True,
            "message": "Document has been flagged successfully.",
        })

    except Exception as exc:

        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

import json
from django.http import JsonResponse


def verify_seller_document(request, document_id):
    try:
        payload = json.loads(request.body)

        account_services.verify_seller_document_service(
            document_id=document_id,
            document_type=payload.get("document_type"),
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Document verified successfully.",
            }
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )


import json
from django.http import JsonResponse


def request_missing_document(request):
    try:
        payload = json.loads(request.body)
        print(payload)

        account_services.request_missing_document_service(
            application_id=payload.get("application_id"),
            document_type=payload.get("document_type"),
            reason=payload.get("reason"),
            note=payload.get("note"),
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Document request sent successfully.",
            }
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )


from django.views.decorators.http import require_POST


@require_POST
def save_application_notes(request):

    try:

        payload = json.loads(request.body)

        account_services.save_application_notes_service(
            application_id=payload.get("application_id"),
            notes=payload.get("notes", ""),
        )

        return JsonResponse({
            "success": True,
            "message": "Notes saved successfully.",
        })

    except Exception as e:

        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )
    
from django.contrib.admin.views.decorators import staff_member_required
from . import services


def export_order_history(request, user_id):
    return services.export_order_history(user_id)

from accounts.models import Seller
@staff_member_required
def export_seller_orders(request, seller_id):
    seller = get_object_or_404(Seller, id=seller_id)
    return services.export_seller_orders(seller)

from .revenue_report import export_revenue_report
# @staff_member_required
def export_revenue_report_view(request, seller_id):
    """
    Admin-only endpoint to export a seller's complete revenue report as a PDF.
    """
    seller = get_object_or_404(Seller, pk=seller_id)
    
    # The service function handles calculations, PDF building, and the HTTP Response
    return export_revenue_report(seller)

from django.contrib.sessions.models import Session
def logout_all_devices(request):

    user_id = request.POST.get("userId")

    deleted = 0

    for session in Session.objects.all():
        data = session.get_decoded()

        if data.get("_auth_user_id") == str(user_id):
            session.delete()
            deleted += 1

    return JsonResponse(
        {"status": "success", "message": f"Logged out from {deleted} active device(s)."}
    )


from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import get_user_model

# Adjust the import path based on where you save the service file
from accounts.buyer_pdf import generate_buyer_profile_pdf

User = get_user_model()


def export_buyer_profile(request, user_id):
    """
    Exports a comprehensive buyer profile as a professionally formatted PDF.
    Restricted to staff/admin users.
    """
    # Using prefetch_related for common relational names to prevent N+1 queries.
    # The service will dynamically check these relationships gracefully.
    prefetch_fields = [
        "order_set",
        "orders",
        "address_set",
        "addresses",
        "useraddress_set",
        "review_set",
        "reviews",
        "wishlist_set",
        "wishlists",
    ]

    # Filter valid relationships that actually exist on the User model
    valid_prefetches = [
        f
        for f in prefetch_fields
        if hasattr(User, f) or hasattr(User, f.replace("_set", ""))
    ]

    buyer = get_object_or_404(
        User.objects.prefetch_related(*valid_prefetches), pk=user_id
    )

    # Delegate PDF generation to the dedicated service
    pdf_buffer = generate_buyer_profile_pdf(buyer, request.user)

    # Construct filename based on requirement: buyer_john_doe_YYYY-MM-DD.pdf
    date_str = timezone.now().strftime("%Y-%m-%d")
    identifier = getattr(buyer, "username", getattr(buyer, "first_name", str(buyer.id)))
    safe_name = str(identifier).replace(" ", "_").replace(".", "_").lower()
    filename = f"buyer_{safe_name}_{date_str}.pdf"

    # Return the binary buffer as an HTTP download response
    response = HttpResponse(pdf_buffer, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'

    return response


from accounts.seller_pdf import export_seller_profile_snapshot
# =============================================================
# DJANGO VIEW
# =============================================================
# @staff_member_required
def export_seller_profile(request, seller_id):
    """
    Admin-only endpoint to export a seller's complete profile snapshot as a PDF.
    """
    # Assuming Seller model is imported at the top. 
    # Use apps.get_model as a robust fallback for generic code execution.
    from django.apps import apps
    Seller = apps.get_model('accounts', 'Seller')
    
    seller = get_object_or_404(
        Seller.objects.select_related(
            "user",
            "profile",
            "settings",
        ),
        pk=seller_id,
    )
    
    return export_seller_profile_snapshot(seller)

from django.http import JsonResponse
from django.views.decorators.http import require_POST

from accounts.services import update_buyer_profile


@require_POST
def update_buyer_profile_view(request, buyer_id):

    success, message, buyer = update_buyer_profile(request=request, buyer_id=buyer_id)

    if not success:
        return JsonResponse({"success": False, "message": message}, status=400)

    return JsonResponse(
        {
            "success": True,
            "message": message,
            "buyer": {
                "id": buyer.id,
                "first_name": buyer.first_name,
                "last_name": buyer.last_name,
                "username": buyer.username,
                "email": buyer.email,
                "contact": buyer.contact,
                "account_status": buyer.account_status,
            },
        }
    )


from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST

from allauth.account.forms import ResetPasswordForm
from django.contrib.auth import get_user_model

User = get_user_model()


@staff_member_required
@require_POST
def admin_reset_password(request, user_id):
    buyer = get_object_or_404(User, id=user_id)

    form = ResetPasswordForm(
        data={
            "email": buyer.email,
        }
    )

    if form.is_valid():
        form.save(request)

        return JsonResponse(
            {"success": True, "message": f"Password reset email sent to {buyer.email}."}
        )

    return JsonResponse(
        {"success": False, "error": form.errors.get_json_data()}, status=400
    )


def send_user_email(request, user_id):
    try:
        user = User.objects.get(pk=user_id)

    except User.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Buyer not found.",
            },
            status=404,
        )

    subject = request.POST.get("subject", "").strip()
    message = request.POST.get("message", "").strip()
    button_text = request.POST.get("buttonText", "").strip()
    button_url = request.POST.get("buttonUrl", "").strip()

    if not subject:
        return JsonResponse(
            {
                "success": False,
                "message": "Subject is required.",
            },
            status=400,
        )

    if not message:
        return JsonResponse(
            {
                "success": False,
                "message": "Message is required.",
            },
            status=400,
        )

    attachments = request.FILES.getlist("attachments")

    try:
        services.send_admin_email(
            user=user,
            subject=subject,
            message=message,
            button_text=button_text or None,
            button_url=button_url or None,
            attachments=attachments,
        )

    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=500,
        )

    return JsonResponse(
        {
            "success": True,
            "message": "Email sent successfully.",
        }
    )
