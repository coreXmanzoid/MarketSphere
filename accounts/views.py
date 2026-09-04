from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth import login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
import json

from accounts.seller_pdf import export_seller_profile_snapshot
from .decorators import verified_seller, verified_user, only_seller
from django.http import JsonResponse

User = get_user_model()
from . import validator
from . import services

# Create your views here.


def login_view(request):
    if request.method == "POST":
        identifier = request.POST.get("identifier").lower()
        password = request.POST.get("password")
        remember_me = request.POST.get("remember")

        user = services.get_user_by_identifier(identifier)
        if not user:
            messages.error(request, "Invalid Credentials.")
            return redirect("login")

        authenticated_user = authenticate(
            request, username=user.username, password=password
        )
        if not authenticated_user:
            messages.error(request, "Invalid Credentials.")
            return redirect("login")

        validate_account_status, message = validator.validate_account_status(
            authenticated_user
        )
        if not validate_account_status:
            messages.error(request, message)
            return redirect("login")

        login(request, authenticated_user)
        if not remember_me:
            request.session.set_expiry(0)

        return redirect(settings.LOGIN_REDIRECT_URL)

    return render(request, "login.html")


def signup_view(request):
    if request.method == "POST":
        user = {
            "first_name": request.POST.get("first_name"),
            "last_name": request.POST.get("last_name"),
            "email": request.POST.get("email").lower(),
            "username": request.POST.get("username").lower(),
            "contact": request.POST.get("contact"),
            "password": request.POST.get("password"),
        }
        if validator.validate_user_email(user["email"]) == False:
            messages.error(request, "Email Already Exists.")
            return redirect("signup")

        if validator.validate_username(user["username"]) == False:
            messages.error(request, "Email Already Exists.")
            return redirect("signup")

        if validator.validate_password(user["password"]) == False:
            messages.error(request, "Enter a valid password")
            return redirect("signup")
        user = services.create_user(user)
        services.send_verification_email(request, user, signup=True)

        messages.success(
            request,
            "Your account has been created successfully. We've sent a verification email to your inbox. Please verify your email before accessing all features.",
        )

        return redirect("login")

    return render(request, "signup.html")


@login_required
@verified_user
def seller_signup_view(request):
    print(request.POST)
    print(request.FILES)
    if request.method == "POST":
        seller = services.create_seller_application(
            request.user,
            request.POST,
            request.FILES,
        )
        return redirect("seller-account")
    return render(request, "seller_signup.html")


@only_seller
def update_seller_info(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )
    try:
        services.update_seller_information(
            request.user,
            request.POST,
            request.FILES,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Store information updated successfully.",
            }
        )

    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )


from . import services
from .decorators import only_seller


@login_required
@only_seller
def deactivate_seller_account(request):
    if request.method != "POST":
        return JsonResponse(
            {"status": "error", "message": "Invalid request."},
            status=405,
        )

    services.deactivate_seller_account(request.user.seller_profile)

    return JsonResponse(
        {
            "status": "success",
            "message": "Seller account deactivated successfully.",
        }
    )


@login_required
@only_seller
def reactivate_seller_account(request):
    if request.method != "POST":
        return JsonResponse(
            {"status": "error", "message": "Invalid request."},
            status=405,
        )

    services.reactivate_seller_account(request.user.seller_profile)

    return JsonResponse(
        {
            "status": "success",
            "message": "Seller account activated successfully.",
        }
    )


@login_required
@only_seller
def update_seller_address(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    try:
        services.update_seller_address(
            request.user,
            request.POST,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Business address updated successfully.",
            }
        )

    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )

@only_seller
def seller_account(request):
    seller = request.user.seller_profile

    business_address = services.get_bussiness_address(seller)

    documents = services.get_seller_application_documents(seller)

    application_progress = services.calculate_application_progress(seller)

    context = {
        "seller": seller,
        "business_address": business_address,
        "documents": documents,
        "application_progress": application_progress,
    }

    return render(request, "seller_account.html", context)


@login_required
def profile_view(request):
    """
    Buyer-facing "My Profile" / My Account page.

    Kept intentionally thin — all data-gathering (orders, addresses,
    wishlist preview, profile completion, activity, notifications)
    lives in services.get_buyer_profile_context() so this view stays
    easy to read and the template stays fully driven by context data.
    """
    context = services.get_buyer_profile_context(request.user)

    return render(request, "buyer_profile.html", context)

@login_required
def save_user_address(request):
    if request.method != "POST":
        return JsonResponse(
            {"success": False},
            status=405,
        )

    data = json.loads(request.body)

    address = services.save_user_address(
        request.user,
        data,
    )

    return JsonResponse({
        "success": True,
        "message": "Address added successfully.",
        "address": {
            "id": address.id,
            "address_type": address.address_type,
            "address_type_display": address.get_address_type_display(),
            "full_name": address.full_name,
            "phone": address.phone,
            "address_line_1": address.address_line_1,
            "address_line_2": address.address_line_2,
            "city": address.city,
            "postal_code": address.postal_code,
            "is_default": address.is_default,
        },
    })
import json

@login_required
def update_user_address(request):
    try:
        data = json.loads(request.body)

        address = services.update_user_address(
            request.user,
            data,
        )

        return JsonResponse({
            "success": True,
            "message": "Address updated successfully.",
            "address": {
                "id": address.id,
                "address_type": address.address_type,
                "address_type_display": address.get_address_type_display(),
                "full_name": address.full_name,
                "phone": address.phone,
                "address_line_1": address.address_line_1,
                "address_line_2": address.address_line_2,
                "city": address.city,
                "postal_code": address.postal_code,
                "is_default": address.is_default,
            },
        })

    except ValueError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )

    except Exception:
        return JsonResponse(
            {
                "success": False,
                "message": "Something went wrong. Please try again.",
            },
            status=500,
        )

import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from .services import delete_user_address


@login_required
def delete_user_address_view(request):
    try:
        data = json.loads(request.body)

        delete_user_address(request.user, data)

        return JsonResponse(
            {"success": True, "message": "Address deleted successfully."}
        )

    except ValueError as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)

    except Exception:
        return JsonResponse(
            {"success": False, "message": "Something went wrong. Please try again."},
            status=500,
        )

import json
from django.contrib.auth import logout
from django.contrib.auth import update_session_auth_hash
def change_password(request):
    try:
        data = json.loads(request.body or "{}")

        current_password = data.get("current_password", "").strip()
        new_password = data.get("new_password", "")
        confirm_password = data.get("confirm_password", "")
        services.change_user_password(
            user=request.user,
            current_password=current_password,
            new_password=new_password,
            confirm_password=confirm_password,
        )

        logout(request)

        return JsonResponse({
            "success": True,
            "message": "Your password has been changed successfully.",
        })

    except ValueError as error:
        return JsonResponse({
            "success": False,
            "message": str(error),
        }, status=400)

    except json.JSONDecodeError:
        return JsonResponse({
            "success": False,
            "message": "Invalid request data.",
        }, status=400)

    except Exception:
        return JsonResponse({
            "success": False,
            "message": "Something went wrong. Please try again.",
        }, status=500)
    
@login_required
def update_shipping_preferences_view(request):

    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request.",
            },
            status=405,
        )

    seller = request.user.seller_profile

    services.update_shipping_preferences(seller, request.POST)

    return JsonResponse(
        {
            "success": True,
            "message": "Shipping preferences updated successfully.",
        }
    )


from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from . import services


@login_required
def update_notification_preferences_view(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    seller = request.user.seller_profile

    services.update_notification_preferences(seller, request.POST)

    return JsonResponse(
        {
            "success": True,
            "message": "Notification preferences updated successfully.",
        }
    )


@login_required
def logout_user(request):
    logout(request)
    return redirect("login")


@login_required
def resend_verification_email_view(request):
    if request.method != "POST":
        return redirect(settings.LOGIN_REDIRECT_URL)

    sent = services.send_verification_email(request, request.user)

    if sent:
        messages.success(
            request, f"A new verification email has been sent.({request.user.email})"
        )
    else:
        messages.info(request, "Your email address is already verified.")

    return redirect(settings.LOGIN_REDIRECT_URL)


from django.http import JsonResponse


def change_store_banner(request):
    if request.method != "POST":
        return JsonResponse({"success": False}, status=405)

    seller_id = request.POST.get("seller_id")
    banner = request.FILES.get("banner")

    banner_url = services.change_store_banner(
        seller_id=seller_id,
        banner=banner,
    )

    if banner_url:
        return JsonResponse(
            {
                "success": True,
                "banner_url": banner_url,
            }
        )

    return JsonResponse(
        {
            "success": False,
            "message": "Unable to update banner.",
        }
    )


from .models import Seller


def change_seller_status(request):
    if request.method != "POST":
        return JsonResponse({"success": False}, status=405)

    seller = Seller.objects.filter(id=request.POST.get("seller_id")).first()

    if not seller:
        return JsonResponse(
            {
                "success": False,
                "message": "Seller not found.",
            }
        )

    services.update_seller_status(
        seller,
        request.POST.get("status"),
    )

    return JsonResponse({"success": True})


import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST
from django.contrib.admin.views.decorators import staff_member_required

from accounts.models import Seller
from . import services


@require_POST
def update_store_information(request, seller_id):
    seller = get_object_or_404(Seller, id=seller_id)

    data = json.loads(request.body)

    services.update_store_information(seller, data)

    return JsonResponse(
        {"success": True, "message": "Store information updated successfully."}
    )


from django.contrib.auth.decorators import login_required
from django.http import JsonResponse


@login_required
def update_seller_profile(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    success, message = services.update_seller_profile_service(
        request.user,
        request.POST,
    )

    return JsonResponse(
        {
            "success": success,
            "message": message,
        }
    )


from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

@login_required
@require_POST
def update_my_profile_view(request):
    buyer = request.user

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

    success, message, buyer, email_changed, errors = (
        services.update_buyer_profile(
            user=buyer,
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            username=data.get("username"),
            email=data.get("email"),
            contact=data.get("phone"),
            allow_status_change=False,
            request=request,
        )
    )

    if not success:
        return JsonResponse(
            {
                "success": False,
                "message": message,
                "errors": errors,
            },
            status=400,
        )

    return JsonResponse(
        {
            "success": True,
            "message": message,
            "email_changed": email_changed,
            "user": {
                "id": buyer.id,
                "first_name": buyer.first_name,
                "last_name": buyer.last_name,
                "username": buyer.username,
                "email": buyer.email,
                "contact": buyer.contact,
            },
        }
    )

@login_required
def update_seller_document(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid request method.",
            },
            status=405,
        )

    success, message, document = services.update_seller_document_service(
        user=request.user,
        data=request.POST,
        files=request.FILES,
    )

    response = {
        "success": success,
        "message": message,
    }

    if success:
        response["document_url"] = document.file.url
        response["uploaded_at"] = document.uploaded_at.strftime("%b %d, %Y")

    return JsonResponse(response)