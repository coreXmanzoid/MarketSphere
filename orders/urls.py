from django.urls import path
from . import views

urlpatterns = [
    path("", views.orders, name="orders"),
    path("<str:order_number>", views.order, name="order"),
    path("checkout/", views.checkout, name="checkout"),
    path("place-order/", views.place_new_order, name="place-order"),
    path(
        "confirmation/<str:order_number>/",
        views.order_confirmation,
        name="order_confirmation",
    ),
    path(
        "<str:order_number>/invoice/",
        views.download_invoice,
        name="download_invoice",
    ),
    path("cancel-order/<str:order_number>/", views.order_cancelation, name="cancel-order"),
    path("reorder/<str:order_number>/", views.reorder, name="reorder"),
]