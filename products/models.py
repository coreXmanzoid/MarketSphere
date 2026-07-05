from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

# Create your models here.
# will be shifted to products app later
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children"
    )

    slug = models.SlugField(unique=True)

    description = models.TextField(blank=True)

    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Bootstrap icon or Font Awesome class"
    )

    image = models.ImageField(
        upload_to="categories/images/",
        blank=True,
        null=True
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)

    slug = models.SlugField(unique=True)

    logo = models.ImageField(
        upload_to="brands/logos/",
        blank=True,
        null=True
    )

    description = models.TextField(blank=True)

    website = models.URLField(blank=True)

    is_active = models.BooleanField(default=True)


    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
    

class Product(TimeStampedModel):
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products"
    )

    brand = models.ForeignKey(
        Brand,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products"
    )

    # shop = models.ForeignKey(
    #     "shops.Shop",
    #     on_delete=models.CASCADE,
    #     null=True,
    #     blank=True,
    #     related_name="products"
    # )

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)

    short_description = models.CharField(
        max_length=300,
        blank=True
    )

    description = models.TextField()

    sku = models.CharField(
        max_length=100,
        unique=True
    )

    barcode = models.CharField(
        max_length=100,
        blank=True
    )

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    discount_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    stock_quantity = models.PositiveIntegerField(default=0)

    min_stock_level = models.PositiveIntegerField(default=5)

    weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True
    )

    is_active = models.BooleanField(default=True)

    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name




class ProductImage(TimeStampedModel):
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="images"
    )

    image = models.ImageField(
        upload_to="products/images/"
    )

    alt_text = models.CharField(
        max_length=255,
        blank=True,
        help_text="Short description of the image for accessibility and SEO."
    )

    is_primary = models.BooleanField(
        default=False,
        help_text="Used as the main image throughout the website."
    )

    display_order = models.PositiveSmallIntegerField(
        default=1,
        help_text="Lower numbers appear first."
    )

    class Meta:
        ordering = ["display_order", "id"]
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"

    def __str__(self):
        return f"{self.product.name} - Image {self.display_order}"