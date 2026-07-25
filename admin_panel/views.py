from django.shortcuts import render

# Create your views here.
def dashboard(request):
    return render(request, "admin_dashboard.html")

def user_management(request):
    return render(request, "user_management/overview.html")

def user_buyer(request):
    return render(request, "user_management/buyer/buyers.html")