from django.test import TestCase

from .models import Product
from .services import paginate_products, sort_products


class ProductPaginationTests(TestCase):
    def setUp(self):
        Product.objects.bulk_create([
            Product(
                name=f"Phone {index}",
                slug=f"phone-{index}",
                sku=f"sku-{index}",
                price=100 + index,
                status=Product.Status.PUBLISHED,
            )
            for index in range(25)
        ])

    def test_pagination_is_applied_to_final_sorted_queryset(self):
        queryset = sort_products(Product.objects.all(), "price_low_high")
        paginator, page = paginate_products(queryset, 2, per_page=12)

        self.assertEqual(paginator.count, 25)
        self.assertEqual(page.number, 2)
        self.assertEqual(len(page.object_list), 12)
        self.assertEqual(page.object_list[0].name, "Phone 12")

    def test_invalid_page_numbers_fall_back_without_error(self):
        paginator, first_page = paginate_products(Product.objects.all(), "abc", per_page=12)
        self.assertEqual(first_page.number, 1)
        self.assertEqual(paginator.get_page(-1).number, paginator.num_pages)
        self.assertEqual(paginator.get_page(999).number, paginator.num_pages)
