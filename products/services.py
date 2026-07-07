from .models import Category, Brand, Product
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404


def get_all_categories():

    categories = Category.objects.filter(parent=None, is_active=True).prefetch_related(
        Prefetch(
            "children",
            queryset=Category.objects.filter(is_active=True).prefetch_related(
                Prefetch(
                    "children",
                    queryset=Category.objects.filter(is_active=True),
                )
            ),
        )
    )
    return categories

def get_all_brands():
    brands = Brand.objects.filter(is_active=True)
    return brands

def get_product_by_slug(product_slug):
    return get_object_or_404(
        Product.objects.select_related(
            "category",
            "brand"
        ).prefetch_related(
            "images"
        ),
        slug=product_slug,
        is_active=True
    )