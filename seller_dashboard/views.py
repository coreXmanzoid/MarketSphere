from django.shortcuts import render
from accounts.decorators import verified_seller
from products.services import create_product
# Create your views here.


def dashboard(request):
    seller = request.user.seller_profile
    context = {}
    return render(request, "dashboard.html", context)


def products(request):
    return render(request, "products/list.html")


from django.http import JsonResponse


def add_product(request):

    if request.method == "POST":

        product = create_product(
            request.user,
            request.POST,
            request.FILES,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Product created successfully.",
                "product_id": product.id,
            }
        )
    return render(request, "products/create.html")
