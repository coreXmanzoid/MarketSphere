from django.core.cache import cache

from .models import MarketplaceSettings


MARKETPLACE_SETTINGS_CACHE_KEY = "marketplace_settings:all"
MARKETPLACE_SETTINGS_CACHE_TIMEOUT = 60


def get_marketplace_settings():
    """Return cached marketplace settings without creating a database row."""
    try:
        cached = cache.get(MARKETPLACE_SETTINGS_CACHE_KEY)
        if cached is not None:
            return cached

        settings = MarketplaceSettings.objects.filter(pk=1).first()
        if settings is None:
            settings = MarketplaceSettings(pk=1)

        cache.set(
            MARKETPLACE_SETTINGS_CACHE_KEY,
            settings,
            timeout=MARKETPLACE_SETTINGS_CACHE_TIMEOUT,
        )
        return settings
    except Exception:
        # Model defaults keep the application usable if settings storage is
        # temporarily unavailable.
        return MarketplaceSettings(pk=1)


def invalidate_marketplace_settings_cache():
    try:
        cache.delete(MARKETPLACE_SETTINGS_CACHE_KEY)
    except Exception:
        pass
