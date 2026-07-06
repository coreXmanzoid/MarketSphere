from .services import get_all_categories, get_all_brands


def categories(request):
    return {
        "categories": get_all_categories(),
        "brands": get_all_brands(),
    }
