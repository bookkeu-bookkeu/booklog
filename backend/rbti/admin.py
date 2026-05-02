from django.contrib import admin

from .models import (
    RbtiType,
    UserRbtiSnapshot,
    RbtiSurveyQuestion,
    RbtiSurveyChoice,
    RbtiSurveySession,
    RbtiSurveyAnswer,
)


@admin.register(RbtiType)
class RbtiTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "name", "axis_1", "axis_2", "axis_3")
    search_fields = ("code", "name")
    ordering = ("id",)


@admin.register(UserRbtiSnapshot)
class UserRbtiSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "rbti_type",
        "source_type",
        "is_current",
        "created_at",
    )
    list_filter = ("source_type", "is_current", "rbti_type")
    search_fields = ("user__email", "user__nickname", "rbti_type__code")
    autocomplete_fields = ("user", "rbti_type")
    ordering = ("id",)


class RbtiSurveyChoiceInline(admin.TabularInline):
    model = RbtiSurveyChoice
    extra = 4


@admin.register(RbtiSurveyQuestion)
class RbtiSurveyQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "order_no", "axis_type", "is_active")
    list_filter = ("axis_type", "is_active")
    search_fields = ("question_text",)
    ordering = ("order_no", "id")
    inlines = [RbtiSurveyChoiceInline]


@admin.register(RbtiSurveySession)
class RbtiSurveySessionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "rbti_type",
        "is_retest",
        "created_at",
    )
    list_filter = ("is_retest", "rbti_type")
    search_fields = ("user__email", "user__nickname", "rbti_type__code")
    autocomplete_fields = ("user", "rbti_type")
    ordering = ("id",)


@admin.register(RbtiSurveyAnswer)
class RbtiSurveyAnswerAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "question", "answer_value", "created_at")
    search_fields = ("session__user__email", "session__user__nickname", "question__question_text")
    autocomplete_fields = ("session", "question")
    ordering = ("id",)