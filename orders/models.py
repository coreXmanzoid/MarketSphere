from django.conf import settings
from django.db import models


class Order(models.Model):

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PAID = "paid", "Paid"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders"
    )

    order_number = models.CharField(max_length=64, unique=True)

    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID
    )

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    shipping_name = models.CharField(max_length=255)
    shipping_phone = models.CharField(max_length=32, blank=True, null=True)
    shipping_address = models.CharField(max_length=512)
    shipping_city = models.CharField(max_length=255)
    shipping_postal_code = models.CharField(max_length=20, blank=True, null=True)

    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def overall_status(self):
        """
        Derives a single overall status for the order from its
        SellerOrder children. Returns one of the SellerOrder.Status
        values if every seller-order agrees, 'delivered'/'cancelled'
        for a settled mix of those two, or 'partial' when the
        seller-orders are genuinely in different active stages.
        Returns None if the order has no seller-orders (shouldn't
        normally happen).
        """
        statuses = list(self.seller_orders.values_list("status", flat=True))

        if not statuses:
            return None

        unique = set(statuses)

        if len(unique) == 1:
            return statuses[0]

        settled = {SellerOrder.Status.DELIVERED, SellerOrder.Status.CANCELLED}
        if unique <= settled:
            return (
                SellerOrder.Status.DELIVERED
                if SellerOrder.Status.DELIVERED in unique
                else SellerOrder.Status.CANCELLED
            )

        return "partial"

    @property
    def items(self):
        return OrderItem.objects.filter(seller_order__order=self).select_related(
            "product"
        )

    def get_overall_status_display(self):
        status = self.overall_status

        if status is None:
            return "—"

        if status == "partial":
            return "Partially Processed"

        return dict(SellerOrder.Status.choices).get(status, status.title())

    def __str__(self):
        return self.order_number


class SellerOrder(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PROCESSING = "processing", "Processing"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="seller_orders"
    )

    seller = models.ForeignKey(
        "accounts.Seller", on_delete=models.CASCADE, related_name="orders"
    )

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    tracking_number = models.CharField(max_length=100, blank=True)
    courier = models.CharField(max_length=100, blank=True)

    shipped_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)

    estimated_delivery = models.DateField(null=True, blank=True)

    shipping_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("order", "seller")

    def __str__(self):
        return f"{self.order.order_number} - {self.seller.store_name}"


class OrderItem(models.Model):

    seller_order = models.ForeignKey(
        SellerOrder, on_delete=models.CASCADE, related_name="items"
    )

    product = models.ForeignKey(
        "products.Product", on_delete=models.PROTECT, related_name="order_items"
    )

    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
