from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class Address(models.Model):

    HOME = "home"
    OFFICE = "office"
    BUSINESS = "business"
    OTHER = "other"

    ADDRESS_TYPES = [
        (HOME, "Home"),
        (OFFICE, "Office"),
        (BUSINESS, "Business"),
        (OTHER, "Other"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="addresses",
    )

    address_type = models.CharField(
        max_length=20,
        choices=ADDRESS_TYPES,
        default=HOME,
    )

    full_name = models.CharField(max_length=150)

    phone = models.CharField(max_length=20)

    address_line_1 = models.CharField(max_length=255)

    address_line_2 = models.CharField(
        max_length=255,
        blank=True,
    )

    city = models.CharField(max_length=100)

    postal_code = models.CharField(max_length=20)

    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.pk and not self.user.addresses.exists():
            self.is_default = True

        if self.is_default:
            self.user.addresses.exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.get_address_type_display()}"


class User(AbstractUser):

    class AccountStatus(models.TextChoices):
        UNVERIFIED = "UNVERIFIED", "Unverified"
        VERIFIED = "VERIFIED", "Verified"
        SUSPENDED = "SUSPENDED", "Suspended"
        DEACTIVATED = "DEACTIVATED", "Deactivated"
        BLOCKED = "BLOCKED", "Blocked"

    contact = models.CharField(max_length=20, blank=True)

    profile_image_url = models.URLField(blank=True, null=True, max_length=500)


    account_status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.UNVERIFIED,
    )


from django.conf import settings
from django.db import models


class Seller(models.Model):

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        DEACTIVATED = "deactivated", "Deactivated"
        SUSPENDED = "suspended", "Suspended"
        BLOCKED = "blocked", "Blocked"
        REJECTED = "rejected", "Rejected"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="seller_profile"
    )

    store_email = models.EmailField(blank=True, null=True)

    store_name = models.CharField(max_length=100)

    slug = models.SlugField(
        unique=True,
        help_text="Unique URL for the seller store."
    )

    store_description = models.TextField(
        blank=True,
        null=True
    )

    store_logo = models.ImageField(
        upload_to="store_logos/",
        blank=True,
        null=True
    )

    store_banner = models.ImageField(
        upload_to="store_banners/",
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    verification_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Reason for rejection or notes from the admin."
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)
    
    @property
    def is_verified(self):
        return self.status == self.Status.VERIFIED


    @property
    def can_sell(self):
        return self.status == self.Status.VERIFIED


    @property
    def can_access_dashboard(self):
        return self.status in (
            self.Status.VERIFIED,
            self.Status.DEACTIVATED,
        )
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Seller"
        verbose_name_plural = "Sellers"

    def __str__(self):
        return self.store_name