from functools import wraps
from django.contrib import messages
from django.shortcuts import redirect


def verified_user(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect("login")

        if not request.user.email_verified:
            messages.error(
                request,
                "Please verify your email before placing an order."
            )
            return redirect("profile")

        return view_func(request, *args, **kwargs)

    return wrapper



def only_seller(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        seller = getattr(request.user, "seller_profile", None)

        if seller is None:
            messages.error(
                request,
                "You must have a seller account to access this page."
            )
            return redirect("seller-signup")

        return view_func(request, *args, **kwargs)

    return wrapper


def verified_seller(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        seller = getattr(request.user, "seller_profile", None)

        if seller is None:
            messages.error(
                request,
                "Please apply for a seller account."
            )
            return redirect("seller-signup")

        if seller.status != seller.Status.VERIFIED:
            messages.error(
                request,
                "Your seller account has not been verified yet."
            )
            return redirect("seller-account")

        return view_func(request, *args, **kwargs)

    return wrapper