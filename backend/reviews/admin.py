from django.contrib import admin

from .models import Review, QuoteNote, ReviewLike, Keyword, ReviewKeyword


class ReviewKeywordInline(admin.TabularInline):
    model = ReviewKeyword
    extra = 1
    autocomplete_fields = ("keyword",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "book",
        "rating",
        "visibility",
        "like_count",
        "created_at",
        "deleted_at",
    )
    list_filter = ("visibility", "rating")
    search_fields = (
        "user__email",
        "user__nickname",
        "book__title",
        "content",
    )
    autocomplete_fields = ("user", "book", "user_book")
    ordering = ("id",)
    inlines = [ReviewKeywordInline]


@admin.register(QuoteNote)
class QuoteNoteAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "book",
        "page_number",
        "visibility",
        "created_at",
        "deleted_at",
    )
    list_filter = ("visibility",)
    search_fields = (
        "user__email",
        "user__nickname",
        "book__title",
        "quoted_text",
        "note",
    )
    autocomplete_fields = ("user", "book", "user_book")
    ordering = ("id",)


@admin.register(ReviewLike)
class ReviewLikeAdmin(admin.ModelAdmin):
    list_display = ("id", "review", "user", "created_at")
    search_fields = ("review__book__title", "user__email", "user__nickname")
    autocomplete_fields = ("review", "user")
    ordering = ("id",)


@admin.register(Keyword)
class KeywordAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)
    ordering = ("id",)


@admin.register(ReviewKeyword)
class ReviewKeywordAdmin(admin.ModelAdmin):
    list_display = ("id", "review", "keyword", "weight")
    search_fields = ("review__book__title", "keyword__name")
    autocomplete_fields = ("review", "keyword")
    ordering = ("id",)