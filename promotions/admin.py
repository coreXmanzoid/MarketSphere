from django.contrib import admin

from .models import Promotion, PromotionProduct


class PromotionProductInline(admin.TabularInline):
    model = PromotionProduct
    extra = 1
    autocomplete_fields = ["product"]
    fields = ["product", "promotion_price", "is_featured", "display_order"]


class PromotionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "status",
        "start_at",
        "end_at",
        "display_on_homepage",
        "homepage_priority",
    )

    list_filter = (
        "status",
        "display_on_homepage",
    )

    search_fields = (
        "name",
        "slug",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }

    filter_horizontal = ("categories",)

    list_editable = (
        "status",
        "display_on_homepage",
        "homepage_priority",
    )

    ordering = (
        "-created_at",
    )

    inlines = [PromotionProductInline]


class PromotionProductAdmin(admin.ModelAdmin):
    list_display = (
        "promotion",
        "product",
        "promotion_price",
        "is_featured",
        "display_order",
    )

    list_filter = (
        "promotion",
        "is_featured",
    )

    search_fields = (
        "promotion__name",
        "product__name",
    )

    autocomplete_fields = ["product"]

    list_editable = (
        "is_featured",
        "display_order",
    )

    ordering = (
        "promotion",
        "display_order",
    )


admin.site.register(Promotion, PromotionAdmin)
admin.site.register(PromotionProduct, PromotionProductAdmin)