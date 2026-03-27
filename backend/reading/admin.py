from django.contrib import admin

from .models import Shelf, UserBook


@admin.register(Shelf)
class ShelfAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "sort_order")
    search_fields = ("code", "name")
    ordering = ("sort_order", "id")


@admin.register(UserBook)
class UserBookAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "book",
        "shelf",
        "started_at",
        "finished_at",
        "is_favorite",
        "created_at",
    )
    list_filter = ("shelf", "is_favorite")
    search_fields = ("user__email", "user__nickname", "book__title", "book__isbn13")
    autocomplete_fields = ("user", "book", "shelf")
    ordering = ("id",)