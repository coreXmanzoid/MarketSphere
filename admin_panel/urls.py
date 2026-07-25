from . import views
from django.urls import path

urlpatterns = [
    path("", views.dashboard, name="admin-dasboard"),
    path("user/", views.user_management, name="user-management"),
    path("user/buyers/", views.user_buyer, name="user-buyer"),
]
