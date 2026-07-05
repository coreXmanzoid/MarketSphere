from django.shortcuts import render
from . import services

# Create your views here.
def home(request):
    categories = services.get_all_categories()
    return render(request, 'home.html', {"categories": categories})
