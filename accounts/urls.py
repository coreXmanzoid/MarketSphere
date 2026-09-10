from django.urls import path
from . import views

urlpatterns = [
    path("login/", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("seller-signup/", views.seller_signup_view, name="seller-signup"),
    path("seller-account/", views.seller_account, name="seller-account"),
    path("profile/", views.profile_view, name="profile"),
    path("profile/2fa/", views.profile_2fa_redirect, name="profile_2fa_redirect"),
    # Keep allauth's named MFA endpoints on MarketSphere's custom views. These
    # paths must appear before allauth.urls in config.urls.
    path(
        "2fa/authenticate/",
        views.MarketSphereMFAAuthenticateView.as_view(),
        name="mfa_authenticate",
    ),
    path(
        "2fa/reauthenticate/",
        views.MarketSphereMFAReauthenticateView.as_view(),
        name="mfa_reauthenticate",
    ),
    path(
        "profile/2fa/activate/",
        views.ProfileActivateTOTPView.as_view(),
        name="profile_activate_totp",
    ),
    path(
        "profile/2fa/deactivate/",
        views.ProfileDeactivateTOTPView.as_view(),
        name="profile_deactivate_totp",
    ),
    path(
        "profile/2fa/recovery/",
        views.ProfileViewRecoveryCodesView.as_view(),
        name="profile_2fa_recovery",
    ),
    path(
        "profile/update/",
        views.update_my_profile_view,
        name="update_my_profile",
    ),
    path("update-seller-info/", views.update_seller_info, name="update_seller_info"),
    path(
        "update-seller-address/",
        views.update_seller_address,
        name="update_seller_address",
    ),
    path(
        "buyer/address/update/",
        views.update_user_address,
        name="update_user_address",
    ),
    path(
        "buyer/address/delete/",
        views.delete_user_address_view,
        name="delete_user_address",
    ),
    path(
        "change-password/",
        views.change_password,
        name="change_password",
    ),
    path("logout", views.logout_user, name="logout"),
    path(
        "email/resend/",
        views.resend_verification_email_view,
        name="resend_verification_email",
    ),
    path("save-address/", views.save_user_address, name="save-address"),
    path(
        "update-shipping-preferences/",
        views.update_shipping_preferences_view,
        name="update_shipping_preferences",
    ),
    path(
        "update-notification-preferences/",
        views.update_notification_preferences_view,
        name="update_notification_preferences",
    ),
    path(
        "deactivate-seller-account",
        views.deactivate_seller_account,
        name="deactivate_seller_account",
    ),
    path(
        "reactivate-seller-account",
        views.reactivate_seller_account,
        name="reactivate_seller_account",
    ),
    path(
        "change-store-banner/",
        views.change_store_banner,
        name="change-store-banner",
    ),
    path(
        "change-seller-status/",
        views.change_seller_status,
        name="change-seller-status",
    ),
    path(
        "update-seller-profile/",
        views.update_seller_profile,
        name="update_seller_profile",
    ),
    path(
        "preferences/update/",
        views.update_user_preferences,
        name="update_user_preferences",
    ),
    path(
        "<int:seller_id>/update-store/",
        views.update_store_information,
        name="update_store_information",
    ),
    path(
        "update-seller-document/",
        views.update_seller_document,
        name="update_seller_document",
    ),
]
