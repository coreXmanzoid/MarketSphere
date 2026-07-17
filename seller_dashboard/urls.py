from django.urls import path
from . import views
urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("products/", views.products, name="products-list"),
    path("products/add-product/", views.add_product, name="add-product"),
    path("products/edit-product/<slug:product_slug>", views.edit_product, name="edit-product"),
    path("products/hide-product", views.hide_product, name="hide-product"),
    path("products/unhide-product", views.unhide_product, name="unhide-product"),
    path("products/delete-product", views.delete_product, name="delete-product"),
]
