from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("search", views.search, name="search"),
    path("product/<slug:product_slug>/", views.product, name="product"),
    path("wishlist/", views.wishlist, name="wishlist"),
    path(
        "wishlist/toggle/<slug:product_slug>/",
        views.toggle_wishlist,
        name="toggle_wishlist",
    ),
    path("cart/", views.cart, name="cart"),
    path(
        "cart/add/<slug:product_slug>/",
        views.add_to_cart,
        name="add_to_cart",
    ),
    path(
        "cart/remove/<slug:product_slug>/",
        views.remove_from_cart,
        name="remove_from_cart",
    ),
    path(
        "cart/increment/<slug:product_slug>/",
        views.increment_quantity,
        name="increment_quantity",
    ),
    path(
        "cart/decrement/<slug:product_slug>/",
        views.decrement_quantity,
        name="decrement_quantity",
    ),
    path(
        "cart/update/<slug:product_slug>/",
        views.update_quantity,
        name="update_quantity",
    ),
    path(
        "cart/clear/",
        views.clear_cart,
        name="clear_cart",
    ),
    path(
        "cart/data/",
        views.cart_data,
        name="cart_data",
    ),
    path(
        "api/search-brands/",
        views.search_brands,
        name="search_brands",
    ),
    path(
        "api/search-categories/",
        views.search_categories,
        name="search_categories",
    ),
]
