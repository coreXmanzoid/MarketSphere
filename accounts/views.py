from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth import login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
import json
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

    context = {
        "seller": seller,
        "business_address": business_address,
    }

    return render(request, "seller_account.html", context)


@login_required
def save_user_address(request):
    if request.method != "POST":
        return JsonResponse({"success": False}, status=405)

    data = json.loads(request.body)

    services.save_user_address(request.user, data)

    return JsonResponse(
        {
            "success": True,
        }
    )



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
