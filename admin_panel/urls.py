from . import views
from django.urls import path

urlpatterns = [
    path("", views.dashboard, name="admin-dasboard"),
    path("user/", views.user_management, name="user-management"),
    path("user/buyers/", views.user_buyers, name="user-buyers"),
    path("user/buyers/<int:userId>", views.user_buyer, name="user-buyer"),
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
    path('buyers/<int:user_id>/export/', views.export_buyer_profile, name='export_buyer_profile'),
    path(
        "user/buyers/<int:buyer_id>/update-profile/",
        views.update_buyer_profile_view,
        name="update_buyer_profile",
    ),
    path(
    "buyers/<int:buyer_id>/send-email/",
    views.send_buyer_email,
    name="send_buyer_email",
),
]