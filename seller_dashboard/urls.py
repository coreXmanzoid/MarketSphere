from django.urls import path
from . import views
urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("products/", views.products, name="products-list"),
    path("products/add-product/", views.add_product, name="add-product"),
    path("products/save-draft/", views.draft_product, name="save-draft"),
    path("products/edit-product/<slug:product_slug>", views.edit_products, name="edit-product"),
    path("products/hide-product", views.hide_product, name="hide-product"),
    path("products/unhide-product", views.unhide_product, name="unhide-product"),
    path("products/delete-product", views.delete_product, name="delete-product"),

    path("orders/", views.orders, name="orders-list"),
    path("orders/<str:order_no>", views.order_detail, name="order-detail"),
    path("orders/<str:order_no>/<str:status>/", views.update_user_order_status, name="update-order-status"),
    path("settings/", views.dashboard_settings, name="dashboard-settings"),
]
