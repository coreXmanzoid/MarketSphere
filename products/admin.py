from django.contrib import admin

from .models import Category, Brand, Product, ProductImage, WishlistItem, Cart, CartItem
# Register your models here.



class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "parent",
        "is_active",
    )

    list_filter = (
        "is_active",
        "parent",
    )

    search_fields = (
        "name",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }

    list_editable = (
        "is_active",
    )

    ordering = (
        "name",
    )


class BrandAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "is_active",
    )

    list_filter = (
        "is_active",
    )

    search_fields = (
        "name",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }

    list_editable = (
        "is_active",
    )

    ordering = (
        "name",
    )


class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "brand",
        "price",
        "is_active",
    )

    list_filter = (
        "is_active",
        "category",
        "brand",
    )

    search_fields = (
        "name",
        "description",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }

    list_editable = (
        "is_active",
    )

    ordering = (
        "name",
    )


class ProductImageAdmin(admin.ModelAdmin):
    list_display = (
        "product",
        "alt_text",
    )

    list_filter = (
        "product",
    )

    search_fields = (
        "product__name",
        "alt_text",
    )

    ordering = (
        "product",
    )


class WishlistItemAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "product",
    )

    list_filter = (
        "user",
        "product",
    )

    search_fields = (
        "user__username",
        "product__name",
    )

    ordering = (
        "user",
    )


admin.site.register(Category, CategoryAdmin)
admin.site.register(Brand, BrandAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(ProductImage, ProductImageAdmin)
admin.site.register(WishlistItem, WishlistItemAdmin)


class CartAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "created_at",
    )

class CartItemAdmin(admin.ModelAdmin):
    list_display = (
        "cart",
        "product",
        "quantity",
    )

    list_filter = (
        "cart",
        "product",
    )

    search_fields = (
        "product__name",
    )

    ordering = (
        "cart",
    )


admin.site.register(Cart, CartAdmin)
admin.site.register(CartItem, CartItemAdmin)