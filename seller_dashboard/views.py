from django.shortcuts import render
from accounts.decorators import verified_seller
# Create your views here.


def dashboard(request):
    seller = request.user.seller_profile
    context = {
        "seller": seller
    }
    return render(request, "dashboard.html", context)

def products(request):
    return render(request, 'products/list.html')