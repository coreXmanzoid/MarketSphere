from django.urls import path
from . import views

urlpatterns = [
    path(
        "<slug:promotion_slug>/",
        views.promotion_detail,
        name="promotion_detail",
    ),
]
