from django.core.cache import cache

from .models import CheckoutSettings


CHECKOUT_SETTINGS_CACHE_KEY = "checkout_settings:all"
CHECKOUT_SETTINGS_CACHE_TIMEOUT = 60


def get_checkout_settings():
    """Return cached checkout settings, using model defaults if unavailable."""
    try:
        cached = cache.get(CHECKOUT_SETTINGS_CACHE_KEY)
        if cached is not None:
            return cached

        settings = CheckoutSettings.objects.filter(pk=1).first()
        if settings is None:
            settings = CheckoutSettings(pk=1)

        cache.set(
            CHECKOUT_SETTINGS_CACHE_KEY,
            settings,
            timeout=CHECKOUT_SETTINGS_CACHE_TIMEOUT,
        )
        return settings
    except Exception:
        return CheckoutSettings(pk=1)


def invalidate_checkout_settings_cache():
    try:
        cache.delete(CHECKOUT_SETTINGS_CACHE_KEY)
    except Exception:
        pass
