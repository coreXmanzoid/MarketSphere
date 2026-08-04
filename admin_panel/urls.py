from . import views
from django.urls import path

urlpatterns = [
    path("", views.dashboard, name="admin-dasboard"),
    path("user/", views.user_management, name="user-management"),
    path("user/buyers/", views.user_buyers, name="user-buyers"),
    path("user/sellers/", views.user_sellers, name="user-sellers"),
    path("user/buyers/<int:userId>", views.user_buyer, name="user-buyer"),
    path("user/sellers/<int:sellerId>", views.user_seller, name="user-seller"),
    path("user/sellers/<int:sellerId>/application", views.seller_application, name="seller-application"),
    path("change-account-state/", views.change_state, name="change-account-state"),
    path(
        "user/buyers/<int:user_id>/reset-password/",
        views.admin_reset_password,
        name="admin_reset_password",
    ),
    path(
        "logout-all-devices/",
        views.logout_all_devices,
        name="logout-all-devices",
    ),
    path(
        "buyers/<int:user_id>/export/",
        views.export_buyer_profile,
        name="export_buyer_profile",
    ),
    path(
        "sellers/<int:seller_id>/export/",
        views.export_seller_profile,
        name="export_seller_profile",
    ),
    path(
        "user/buyers/<int:buyer_id>/update-profile/",
        views.update_buyer_profile_view,
        name="update_buyer_profile",
    ),
    path(
        "user/<int:user_id>/send-email/",
        views.send_user_email,
        name="send_user_email",
    ),
    path(
        "buyers/<int:user_id>/export-orders/",
        views.export_order_history,
        name="export-order-history",
    ),
    path(
        "sellers/<int:seller_id>/export-orders/",
        views.export_seller_orders,
        name="export_seller_orders",
    ),
    path(
        "sellers/<int:seller_id>/export-revenue/",
        views.export_revenue_report_view,
        name="export_revenue_report",
    ),
]
