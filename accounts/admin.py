from django.contrib import admin

from .models import User, Seller,Address

# Register your models here.
admin.site.register(User)
admin.site.register(Seller)
admin.site.register(Address)