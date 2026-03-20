from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User

    list_display = (
        "id",
        "email",
        "nickname",
        "status",
        "is_staff",
        "is_superuser",
        "created_at",
    )
    list_filter = ("status", "is_staff", "is_superuser", "is_active")
    search_fields = ("email", "nickname")
    ordering = ("id",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("nickname",)}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
        ("Status", {"fields": ("status",)}),
    )

    readonly_fields = ("created_at", "updated_at")

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "nickname", "password1", "password2"),
            },
        ),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "birth_year",
        "is_profile_public",
        "created_at",
    )
    list_filter = ("is_profile_public",)
    search_fields = ("user__email", "user__nickname", "bio")
    autocomplete_fields = ("user",)
    ordering = ("id",)