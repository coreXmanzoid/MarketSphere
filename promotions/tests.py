from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import Seller
from products.models import Cart, Product
from products.services import add_to_cart, get_cart_totals

from .models import Promotion, PromotionProduct


class PromotionPricingFlowTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="buyer", password="test")
        seller_user = get_user_model().objects.create_user(username="seller", password="test")
        seller = Seller.objects.create(
            user=seller_user,
            store_name="Verified Store",
            slug="verified-store",
            status=Seller.Status.VERIFIED,
        )
        self.product = Product.objects.create(
            name="Test Product",
            slug="test-product",
            sku="test-sku",
            price=Decimal("110.00"),
            stock_quantity=10,
            seller=seller,
            status=Product.Status.PUBLISHED,
        )
        now = timezone.now()
        promotion = Promotion.objects.create(
            name="Summer Sale",
            start_at=now - timedelta(hours=1),
            end_at=now + timedelta(hours=1),
            status=Promotion.Status.ACTIVE,
        )
        self.promotion_product = PromotionProduct.objects.create(
            promotion=promotion,
            product=self.product,
            promotion_price=Decimal("100.00"),
        )
        self.user = user

    def test_promotion_cart_totals_are_decimal_and_quantity_aware(self):
        add_to_cart(self.user, self.product.slug, self.promotion_product.id, 3)
        totals = get_cart_totals(self.user)

        self.product.refresh_from_db()
        self.assertEqual(self.product.price, Decimal("110.00"))
        self.assertEqual(totals["original_subtotal"], Decimal("330.00"))
        self.assertEqual(totals["discount"], Decimal("30.00"))
        self.assertEqual(totals["total"], Decimal("300.00"))

    def test_expired_promotion_reverts_cart_to_current_normal_price(self):
        add_to_cart(self.user, self.product.slug, self.promotion_product.id)
        self.promotion_product.promotion.end_at = timezone.now() - timedelta(minutes=1)
        self.promotion_product.promotion.save(update_fields=["end_at"])

        totals = get_cart_totals(self.user)
        self.assertTrue(totals["promotion_ended"])
        self.assertEqual(totals["discount"], Decimal("0.00"))
        self.assertEqual(totals["total"], Decimal("110.00"))

# Create your tests here.
