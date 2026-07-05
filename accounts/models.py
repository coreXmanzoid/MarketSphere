from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):

    class AccountStatus(models.TextChoices):
        UNVERIFIED = "UNVERIFIED", "Unverified"
        VERIFIED = "VERIFIED", "Verified"
        SUSPENDED = "SUSPENDED", "Suspended"
        DEACTIVATED = "DEACTIVATED", "Deactivated"
        BLOCKED = "BLOCKED", "Blocked"

    contact = models.CharField(max_length=20, blank=True)

    address = models.TextField(blank=True)

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
