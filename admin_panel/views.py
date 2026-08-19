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


def catalog_product(request, product_slug):
    context = services.get_product_detail(product_slug)
    return render(request, "catalog/products_management/admin_product_detail.html", context=context)


def catalog_categories(request):
    context = None
    return render(request, "catalog/categories/categories.html", context=context)

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

@require_POST
def update_buyer_profile_view(request, buyer_id):

    success, message, buyer = account_services.update_buyer_profile(request=request, buyer_id=buyer_id)

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

from products import services as product_services
from products.models import Product

@staff_member_required
@require_POST
def approve_product_view(request, product_slug):

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )

    notify_seller = data.get("notify_seller", False)
    publish_immediately = data.get("publish_immediately", False)

    if not product_slug:
        return JsonResponse(
            {
                "success": False,
                "message": "Product slug is required.",
            },
            status=400,
        )

    try:
        product = product_services.approve_product(
            product_slug=product_slug,
            publish_immediately=publish_immediately,
        )
    except Product.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Product not found.",
            },
            status=404,
        )

    if not product:
        return JsonResponse(
            {
                "success": False,
                "message": "Unable to approve product.",
            },
            status=400,
        )

    # TODO:
    # notify_seller will be handled here later.

    return JsonResponse(
        {
            "success": True,
            "message": (
                "Product approved and published successfully."
                if publish_immediately
                else "Product approved successfully."
            ),
            "product": {
                "slug": product.slug,
                "is_approved": product.is_approved,
                "status": product.status,
                "status_display": product.get_status_display(),
            },
        }
    )

@require_POST
def hide_product_view(request, product_slug):

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )

    reason = data.get("reason", "")
    notify_seller = data.get("notify_seller", False)

    if not product_slug:
        return JsonResponse(
            {
                "success": False,
                "message": "Product slug is required.",
            },
            status=400,
        )

    try:
        product = product_services.hide_product_by_slug(product_slug, reason)
    except Product.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Product not found.",
            },
            status=404,
        )

    # TODO:
    # reason will be stored in moderation/history later.
    #
    # TODO:
    # notify_seller will be handled later.

    return JsonResponse(
        {
            "success": True,
            "message": "Product hidden from storefront.",
        }
    )

@staff_member_required
@require_POST
def unhide_product_view(request, product_slug):

    try:
        product_services.unhide_product_by_slug(product_slug)

    except Product.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Product not found.",
            },
            status=404,
        )

    return JsonResponse(
        {
            "success": True,
            "message": "Product unhidden successfully.",
        }
    )

@require_POST
def reject_product_view(request, product_slug):

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )

    reason = data.get("reason", "")
    admin_note = data.get("admin_note", "")
    allow_resubmit = data.get("allow_resubmit", False)

    if not reason:
        return JsonResponse(
            {
                "success": False,
                "message": "Rejection reason is required.",
            },
            status=400,
        )

    try:
        product = product_services.reject_product(
            product_slug=product_slug,
            admin_note=admin_note,
        )

    except Product.DoesNotExist:
        return JsonResponse(
            {
                "success": False,
                "message": "Product not found.",
            },
            status=404,
        )

    # TODO:
    # Email the seller using `admin_note` and `reason`
    # when the email/notification system is integrated.

    # TODO:
    # Store/use `allow_resubmit` when the resubmission
    # workflow is implemented.

    return JsonResponse(
        {
            "success": True,
            "message": "Product rejected successfully.",
            "product": {
                "slug": product.slug,
                "is_approved": product.is_approved,
                "admin_note": product.admin_notes,
            },
        }
    )

@require_POST
def admin_toggle_product_featured_view(request, product_slug):

    try:
        data = json.loads(request.body or "{}")
    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )

    action = data.get("action")

    if action not in {"feature", "unfeature"}:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid featured action.",
            },
            status=400,
        )

    result = product_services.toggle_product_featured(
        product_slug=product_slug,
        action=action,
    )

    if not result["success"]:
        status_code = (
            404
            if result.get("error") == "not_found"
            else 400
        )

        return JsonResponse(
            {
                "success": False,
                "message": result["message"],
            },
            status=status_code,
        )

    return JsonResponse(
        {
            "success": True,
            "featured": result["featured"],
            "changed": result["changed"],
            "message": result["message"],
        }
    )

def publish_product_view(request, product_slug):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    try:
        data = json.loads(request.body or "{}")

    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )

    publish_immediately = data.get(
        "publish_immediately",
        True,
    )

    feature_homepage = data.get(
        "feature_homepage",
        False,
    )

    if not publish_immediately:
        return JsonResponse(
            {
                "success": False,
                "message": "Product must be published immediately.",
            },
            status=400,
        )

    result = product_services.publish_product(
        product_slug=product_slug,
        feature_homepage=feature_homepage,
    )

    if not result["success"]:
        return JsonResponse(
            {
                "success": False,
                "message": result["message"],
            },
            status=404,
        )

    return JsonResponse(result)

def upload_product_image_view(request, product_slug):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    image_file = request.FILES.get("image")

    if not image_file:
        return JsonResponse(
            {
                "success": False,
                "message": "Image is required.",
            },
            status=400,
        )

    try:
        seller = request.user.seller_profile
    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.upload_product_image(
        product_slug=product_slug,
        image_file=image_file,
        seller=seller,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=404,
        )

    return JsonResponse(result)

def delete_product_image_view(request, product_slug, image_id):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    try:
        seller = request.user.seller_profile
    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.delete_product_image(
        product_slug=product_slug,
        image_id=image_id,
        seller=seller,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=404,
        )

    return JsonResponse(result)

def reorder_product_images_view(request, product_slug):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )

    image_ids = data.get("image_ids")

    if not isinstance(image_ids, list) or not image_ids:
        return JsonResponse(
            {
                "success": False,
                "message": "Image order is required.",
            },
            status=400,
        )

    try:
        seller = request.user.seller_profile
    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.reorder_product_images(
        product_slug=product_slug,
        image_ids=image_ids,
        seller=seller,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=400,
        )

    return JsonResponse(result)

def set_primary_product_image_view(request, product_slug, image_id):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    try:
        seller = request.user.seller_profile
    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.set_primary_product_image(
        product_slug=product_slug,
        image_id=image_id,
        seller=seller,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=404,
        )

    return JsonResponse(result)


import json
from decimal import Decimal, InvalidOperation

from django.http import JsonResponse
from django.views.decorators.http import require_POST


@require_POST
def update_product_pricing_view(request, product_slug):

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )

    price_value = data.get("price")
    discount_value = data.get("discount_price")

    if price_value in (None, ""):
        return JsonResponse(
            {
                "success": False,
                "message": "Price is required.",
            },
            status=400,
        )

    try:
        price = Decimal(str(price_value))

    except (InvalidOperation, ValueError, TypeError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid price.",
            },
            status=400,
        )

    if price < 0:
        return JsonResponse(
            {
                "success": False,
                "message": "Price cannot be negative.",
            },
            status=400,
        )

    discount_price = None

    if discount_value not in (None, ""):

        try:
            discount_price = Decimal(
                str(discount_value)
            )

        except (InvalidOperation, ValueError, TypeError):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Invalid discount price.",
                },
                status=400,
            )

        if discount_price < 0:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Discount price cannot be negative.",
                },
                status=400,
            )

        if discount_price >= price:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Discount price must be lower than the current price.",
                },
                status=400,
            )

    try:
        seller = request.user.seller_profile

    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.update_product_pricing(
        product_slug=product_slug,
        seller=seller,
        price=price,
        discount_price=discount_price,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=404,
        )

    return JsonResponse(result)


@require_POST
def remove_product_discount_view(request, product_slug):

    try:
        seller = request.user.seller_profile

    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.remove_product_discount(
        product_slug=product_slug,
        seller=seller,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=404,
        )

    return JsonResponse(result)

@require_POST
def adjust_product_stock_view(request, product_slug):

    try:
        data = json.loads(request.body)

    except (json.JSONDecodeError, TypeError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )

    adjustment_type = data.get(
        "adjustment_type"
    )

    quantity = data.get(
        "quantity"
    )

    reason = data.get(
        "reason",
        ""
    )

    note = data.get(
        "note",
        ""
    )

    if adjustment_type not in {
        "increase",
        "decrease",
        "set",
    }:
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid adjustment type.",
            },
            status=400,
        )

    try:
        quantity = int(quantity)

    except (TypeError, ValueError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid quantity.",
            },
            status=400,
        )

    if quantity < 0:
        return JsonResponse(
            {
                "success": False,
                "message": "Quantity cannot be negative.",
            },
            status=400,
        )

    try:
        seller = request.user.seller_profile

    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.adjust_product_stock(
        product_slug=product_slug,
        seller=seller,
        adjustment_type=adjustment_type,
        quantity=quantity,
        reason=reason,
        note=note,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=400,
        )

    return JsonResponse(result)


@require_POST
def mark_product_out_of_stock_view(
    request,
    product_slug,
):
    try:
        seller = request.user.seller_profile

    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.mark_product_out_of_stock(
        product_slug=product_slug,
        seller=seller,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=404,
        )

    return JsonResponse(result)

@require_POST
def restore_product_stock_view(
    request,
    product_slug,
):
    try:
        seller = request.user.seller_profile

    except AttributeError:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller profile not found.",
            },
            status=403,
        )

    result = product_services.restore_product_stock(
        product_slug=product_slug,
        seller=seller,
    )

    if not result["success"]:
        return JsonResponse(
            result,
            status=400,
        )

    return JsonResponse(result)

import json

from django.http import JsonResponse
from django.views.decorators.http import require_POST

from products.models import Product, Category, Brand
from . import services


@require_POST
def edit_product_view(request, product_slug):

    try:
        product = Product.objects.select_related(
            "seller",
            "category",
            "brand",
        ).get(
            slug=product_slug
        )

    except Product.DoesNotExist:

        return JsonResponse(
            {
                "success": False,
                "message": "Product not found.",
            },
            status=404,
        )


    try:
        data = json.loads(request.body)

    except (json.JSONDecodeError, TypeError):

        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request data.",
            },
            status=400,
        )



    category = None

    category_id = data.get("category_id")

    if category_id:

        category = Category.objects.filter(
            id=category_id
        ).first()

        if not category:

            return JsonResponse(
                {
                    "success": False,
                    "message": "Selected category not found.",
                },
                status=400,
            )



    brand = None

    brand_id = data.get("brand_id")

    if brand_id:

        brand = Brand.objects.filter(
            id=brand_id
        ).first()

        if not brand:

            return JsonResponse(
                {
                    "success": False,
                    "message": "Selected brand not found.",
                },
                status=400,
            )
    post_data = {

        "name": data.get(
            "name",
            product.name
        ).strip(),

        "slug": data.get(
            "slug",
            product.slug
        ).strip(),

        "short_description": data.get(
            "short_description",
            product.short_description or ""
        ),

        "description": data.get(
            "description",
            product.description or ""
        ),

        "sku": data.get(
            "sku",
            product.sku or ""
        ),

        "barcode": data.get(
            "barcode",
            product.barcode or ""
        ),



        "category": (
            category.slug
            if category
            else ""
        ),

        "brand": (
            brand.slug
            if brand
            else ""
        ),



        "price": product.price,

        "discount_price": product.discount_price,

        "stock_quantity": product.stock_quantity,

        "min_stock_level": product.min_stock_level,

        "weight": product.weight,

        "is_featured": (
            "true"
            if product.is_featured
            else "false"
        ),

        "visibility": product.status,



        "tags": json.dumps([]),

        "collections": json.dumps([]),

        "dimensions": json.dumps({}),

        "deleted_images": json.dumps([]),
    }


    try:

        updated_product = product_services.edit_product(
            seller=product.seller,
            product=product,
            post_data=post_data,
            files=request.FILES,
        )

    except Exception as exc:

        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )


    return JsonResponse(
        {
            "success": True,

            "message":
                "Product information updated successfully.",

            "product": {
                "id": updated_product.id,
                "name": updated_product.name,
                "slug": updated_product.slug,
            },
        }
    )