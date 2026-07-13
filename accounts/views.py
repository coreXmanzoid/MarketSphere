from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth import login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
import json 
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

        messages.success(request,
            "Your account has been created successfully. We've sent a verification email to your inbox. Please verify your email before accessing all features.",
        )

        return redirect("login")

    return render(request, "signup.html")

def seller_signup_view(request):
    print(request.POST)
    print(request.FILES)
    if request.method == "POST":
        seller = services.create_seller_application(
            request.user,
            request.POST,
            request.FILES,
        )
        # return redirect("seller-application")
    return render(request, "seller_signup.html")
import json
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

@login_required
def save_user_address(request):
    if request.method != "POST":
        return JsonResponse({"success": False}, status=405)

    data = json.loads(request.body)
    
    services.save_user_address(request.user, data)

    return JsonResponse({
        "success": True,
    })

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
        messages.success(request, f"A new verification email has been sent.({request.user.email})")
    else:
        messages.info(request, "Your email address is already verified.")

    return redirect(settings.LOGIN_REDIRECT_URL)
