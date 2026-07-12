from django.urls import path
from . import views
urlpatterns = [
    path("", views.orders, name="orders"),
    path("/<str:order_number>", views.order, name="order"),
    path("checkout", views.checkout, name="checkout"),
    path("place-order/", views.place_new_order , name="place-order"),
    path(
        "confirmation/<str:order_number>/",
        views.order_confirmation,
        name="order_confirmation",
    ),
]
