from .services import get_all_categories


def categories(request):
    return {
        "categories": get_all_categories(),
    }
