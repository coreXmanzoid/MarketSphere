from django.http import HttpResponse
from django.template.loader import get_template

from .marketplace import get_marketplace_settings


class MarketplaceMaintenanceMiddleware:
    """Block public requests while the marketplace is intentionally offline.

    Admin routes remain available so an administrator can turn the marketplace
    back on. A missing setting, database error, or cache error fails open and
    leaves the storefront online.
    """

    ADMIN_PREFIXES = ("/admin/", "/admin-db/")
    ASSET_PREFIXES = ("/static/", "/media/")

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._is_exempt(request.path) or self._marketplace_is_online():
            return self.get_response(request)

        # Render without a RequestContext so unrelated settings context
        # processors do not query other settings tables during maintenance.
        content = get_template("maintenance.html").render({})
        response = HttpResponse(content, status=503)
        response["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response["Retry-After"] = "300"
        return response

    def _is_exempt(self, path):
        return path.startswith(self.ADMIN_PREFIXES + self.ASSET_PREFIXES)

    @staticmethod
    def _marketplace_is_online():
        return bool(get_marketplace_settings().marketplace_online)
