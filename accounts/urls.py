from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("seller-signup/", views.seller_signup_view, name="seller-signup"),
    path("seller-account/", views.seller_account, name="seller-account"),
    path("update-seller-info/", views.update_seller_info, name="update_seller_info"),
    path("update-seller-address/",views.update_seller_address,name="update_seller_address"),
    path("logout", views.logout_user, name="logout"),
    path(
        "email/resend/",
        views.resend_verification_email_view,
        name="resend_verification_email",
    ),
    path("save-address/", views.save_user_address, name="save-address"),
]
