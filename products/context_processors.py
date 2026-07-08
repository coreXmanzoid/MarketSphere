from .services import get_all_categories, get_all_brands, wishlist_count, cart_count



def categories(request):
    user = request.user

    return {
        "categories": get_all_categories(),
        "brands": get_all_brands(),
        "wishlist_count": wishlist_count(user) if user.is_authenticated else 0,
        "cart_count": cart_count(user) if user.is_authenticated else 0,
    }