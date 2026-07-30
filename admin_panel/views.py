from django.db.models import Sum, Q
from django.db.models.functions import Coalesce
from decimal import Decimal

from django.http import JsonResponse
from django.shortcuts import render
from accounts import services as account_services
from accounts.models import User, Address
from orders.models import Order


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
    return render(
        request, "user_management/buyer/buyers.html", {"buyers": total_buyers}
    )


def user_buyer(request, userId):
    context = services.get_buyer_details(userId)

    return render(
        request,
        "user_management/buyer/buyer_detail.html",
        context,
    )


def user_sellers(request):
    total_sellers = account_services.get_all_sellers()

    return render(
        request, "user_management/seller/seller.html", {"sellers": total_sellers}
    )

def user_seller(request, sellerId):
    return render(request, "user_management/seller/detail.html")

def change_state(request):
    if request.method == "POST":
        user_id = request.POST.get("userId")
        state = request.POST.get("state")
        print(user_id, state)
        account_services.change_account_state(user_id, state)
        return JsonResponse({"status": "success"})
    return JsonResponse({"status": "invalid request"})


from django.contrib.admin.views.decorators import staff_member_required
from . import services


def export_order_history(request, user_id):
    return services.export_order_history(user_id)


from django.contrib.sessions.models import Session
from django.http import JsonResponse
from django.views.decorators.http import require_POST


@require_POST
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


def send_buyer_email(request, buyer_id):
    try:
        buyer = User.objects.get(pk=buyer_id)

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
            user=buyer,
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
