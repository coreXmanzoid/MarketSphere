from unittest.mock import patch

from django.core.cache import cache
from django.contrib.auth.models import AnonymousUser
from django.http import HttpResponse
from django.test import RequestFactory, TestCase

from .middleware import (
    MarketplaceMaintenanceMiddleware,
)
from .marketplace import MARKETPLACE_SETTINGS_CACHE_KEY
from .models import MarketplaceSettings


class MarketplaceMaintenanceMiddlewareTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.get_response = lambda request: HttpResponse("storefront")
        self.middleware = MarketplaceMaintenanceMiddleware(self.get_response)
        cache.delete(MARKETPLACE_SETTINGS_CACHE_KEY)

    def request(self, path):
        request = self.factory.get(path)
        request.user = AnonymousUser()
        return request

    def tearDown(self):
        cache.delete(MARKETPLACE_SETTINGS_CACHE_KEY)

    def test_offline_marketplace_returns_maintenance_response(self):
        MarketplaceSettings.objects.create(pk=1, marketplace_online=False)

        response = self.middleware(self.request("/"))

        self.assertEqual(response.status_code, 503)
        self.assertContains(response, "under maintenance", status_code=503)

    def test_online_marketplace_passes_request_through(self):
        MarketplaceSettings.objects.create(pk=1, marketplace_online=True)

        response = self.middleware(self.request("/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"storefront")

    def test_missing_setting_defaults_to_online(self):
        response = self.middleware(self.request("/"))

        self.assertEqual(response.status_code, 200)

    def test_admin_routes_remain_available_while_offline(self):
        MarketplaceSettings.objects.create(pk=1, marketplace_online=False)

        response = self.middleware(self.request("/admin-db/settings"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"storefront")

    @patch("admin_panel.marketplace.MarketplaceSettings.objects")
    def test_database_errors_fail_open(self, objects):
        objects.filter.side_effect = RuntimeError("database unavailable")

        response = self.middleware(self.request("/"))

        self.assertEqual(response.status_code, 200)

# Create your tests here.
