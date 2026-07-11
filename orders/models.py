from django.conf import settings
from django.db import models


class Order(models.Model):
	class Status(models.TextChoices):
		PENDING = 'pending', 'Pending'
		PROCESSING = 'processing', 'Processing'
		COMPLETED = 'completed', 'Completed'
		CANCELLED = 'cancelled', 'Cancelled'

	class PaymentStatus(models.TextChoices):
		UNPAID = 'unpaid', 'Unpaid'
		PAID = 'paid', 'Paid'
		REFUNDED = 'refunded', 'Refunded'

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
	order_number = models.CharField(max_length=64, unique=True)
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
	payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)

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

	def __str__(self):
		return f"Order {self.order_number} ({self.get_status_display()})"

class OrderItem(models.Model):
	order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
	product = models.ForeignKey('products.Product', on_delete=models.PROTECT, related_name='order_items')
	# seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sold_items')
	price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	quantity = models.PositiveIntegerField(default=1)
	total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"OrderItem {self.product} x {self.quantity} for {self.order.order_number}"

