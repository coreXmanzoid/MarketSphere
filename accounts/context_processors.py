# sellers/context_processors.py

def seller_context(request):
    if request.user.is_authenticated:
        seller = getattr(request.user, "seller_profile", None)
    else:
        seller = None

    return {
        "seller": seller,
    }