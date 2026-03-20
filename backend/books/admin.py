from django.contrib import admin

from .models import Author, Book, BookAuthor


@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "created_at")
    search_fields = ("name",)
    ordering = ("id",)


class BookAuthorInline(admin.TabularInline):
    model = BookAuthor
    extra = 1
    autocomplete_fields = ("author",)


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "isbn13",
        "publisher",
        "published_date",
        "external_api_source",
        "created_at",
    )
    list_filter = ("external_api_source", "publisher")
    search_fields = ("title", "subtitle", "isbn13", "publisher")
    ordering = ("id",)
    inlines = [BookAuthorInline]


@admin.register(BookAuthor)
class BookAuthorAdmin(admin.ModelAdmin):
    list_display = ("id", "book", "author", "role")
    list_filter = ("role",)
    search_fields = ("book__title", "author__name")
    autocomplete_fields = ("book", "author")
    ordering = ("id",)