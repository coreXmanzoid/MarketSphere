from django.shortcuts import render
from . import services

# Create your views here.
def home(request):
    categories = services.get_all_categories()
    brands = services.get_all_brands()
    return render(request, 'home.html', {"categories": categories, "brands": brands})

def search(request):
    q = request.GET.get("q")
    print(q)
    categories = services.get_all_categories()
    brands = services.get_all_brands()
    return render(request, "search_results.html", {"categories": categories, "brands": brands})

def product(request, product_slug):
    product = services.get_product_by_slug(product_slug)
    return render(request, "product_details.html", {"product" : product})