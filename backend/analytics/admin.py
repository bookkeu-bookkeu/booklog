from django.contrib import admin

from .models import ReviewAnalysisResult, BookRbtiStat


@admin.register(ReviewAnalysisResult)
class ReviewAnalysisResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "review",
        "inferred_rbti_type",
        "confidence_score",
        "model_version",
        "analyzed_at",
    )
    list_filter = ("inferred_rbti_type", "model_version")
    search_fields = (
        "review__title",
        "review__book__title",
        "review__user__email",
        "review__user__nickname",
    )
    autocomplete_fields = ("review", "inferred_rbti_type")
    ordering = ("id",)


@admin.register(BookRbtiStat)
class BookRbtiStatAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "book",
        "rbti_type",
        "review_count",
        "avg_review_score",
        "positive_ratio",
        "weighted_score",
        "calculated_at",
    )
    list_filter = ("rbti_type",)
    search_fields = ("book__title", "book__isbn13", "rbti_type__code")
    autocomplete_fields = ("book", "rbti_type", "representative_review")
    ordering = ("id",)