from . import views
from django.urls import path

urlpatterns = [
    path("", views.dashboard, name="admin-dasboard"),
    path("user/", views.user_management, name="user-management"),
    path("user/buyers/", views.user_buyers, name="user-buyers"),
    path("user/sellers/", views.user_sellers, name="user-sellers"),
    path("user/buyers/<int:userId>", views.user_buyer, name="user-buyer"),
    path("user/sellers/<int:sellerId>", views.user_seller, name="user-seller"),
    path(
        "user/sellers/<int:sellerId>/application",
        views.seller_application,
        name="seller-application",
    ),
    path("catalog/products/", views.catalog_products, name="catalog-products"),
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
    path(
        "user/seller/<int:application_id>/application/reject/",
        views.reject_seller_application,
        name="reject_seller_application",
    ),
    path(
        "user/seller/<int:application_id>/application/request-changes/",
        views.request_application_changes,
        name="request_application_changes",
    ),
    path(
        "user/seller/<int:application_id>/application/approve/",
        views.approve_seller_application,
        name="approve_seller_application",
    ),
    path(
        "user/seller/<int:seller_id>/delete/",
        views.delete_seller_application,
        name="delete_seller_application",
    ),
    path(
        "user/seller/document/<int:document_id>/flag/",
        views.flag_seller_document,
        name="flag_seller_document",
    ),
    path(
        "user/seller/document/<int:document_id>/verify/",
        views.verify_seller_document,
        name="verify_seller_document",
    ),
    path(
        "user/seller/document/request/",
        views.request_missing_document,
        name="request_missing_document",
    ),
    path(
        "user/seller/application/save-notes/",
        views.save_application_notes,
        name="save_application_notes",
    ),
]
