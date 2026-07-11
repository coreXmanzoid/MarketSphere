from django.urls import path
from . import views
urlpatterns = [
    path("checkout", views.checkout, name="checkout"),
    path("place-order/", views.place_new_order , name="place-order"),
    path(
        "confirmation/<str:order_number>/",
        views.order_confirmation,
        name="order_confirmation",
    ),
]
