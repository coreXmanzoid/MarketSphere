from django.shortcuts import render
from . import services

# Create your views here.
def home(request):
    categories = services.get_all_categories()
    brands = services.get_all_brands()
    return render(request, 'home.html', {"categories": categories, "brands": brands})

def search(request):
    q = request.POST.get("q")
    print(q)
    categories = services.get_all_categories()
    brands = services.get_all_brands()
    return render(request, "search_results.html", {"categories": categories, "brands": brands})