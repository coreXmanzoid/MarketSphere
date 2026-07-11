from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class Address(models.Model):

    HOME = "home"
    OFFICE = "office"
    OTHER = "other"

    ADDRESS_TYPES = [
        (HOME, "Home"),
        (OFFICE, "Office"),
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
            self.user.addresses.exclude(pk=self.pk).update(
                is_default=False
            )

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

    profile_image_url = models.URLField(blank=True,null=True,max_length=500)
    
    account_status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.UNVERIFIED,
    )

class Seller(models.Model):
    

    class VerificationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"
        
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='seller_profile')
    store_name = models.CharField(max_length=100)
    store_description = models.TextField(blank=True, null=True)
    store_logo = models.ImageField(upload_to='store_logos/', blank=True, null=True)
    store_banner = models.ImageField(upload_to='store_banners/', blank=True, null=True)
    slug = models.SlugField(unique=True)
    
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    def __str__(self):
        return self.store_name
