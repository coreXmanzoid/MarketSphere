from .models import Category, Brand
from django.db.models import Prefetch


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