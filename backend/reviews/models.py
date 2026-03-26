# reviews/models.py

from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator

from common.models import SoftDeleteModel, TimeStampedModel


class Review(TimeStampedModel, SoftDeleteModel):
    VISIBILITY_PUBLIC = "public"
    VISIBILITY_PRIVATE = "private"

    VISIBILITY_CHOICES = [
        (VISIBILITY_PUBLIC, "Public"),
        (VISIBILITY_PRIVATE, "Private"),
    ]

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    book = models.ForeignKey(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    user_book = models.ForeignKey(
        "reading.UserBook",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    content = models.TextField()
    visibility = models.CharField(
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PUBLIC,
    )
    like_count = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "book"],
                name="unique_user_review_per_book",
            )
        ]

    def __str__(self):
        return f"{self.user.nickname} - {self.book.title}"


class QuoteNote(TimeStampedModel, SoftDeleteModel):
    VISIBILITY_PUBLIC = "public"
    VISIBILITY_PRIVATE = "private"

    VISIBILITY_CHOICES = [
        (VISIBILITY_PUBLIC, "Public"),
        (VISIBILITY_PRIVATE, "Private"),
    ]

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="quote_notes",
    )
    book = models.ForeignKey(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="quote_notes",
    )
    user_book = models.ForeignKey(
        "reading.UserBook",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quote_notes",
    )
    quoted_text = models.TextField()
    note = models.TextField(blank=True)
    page_number = models.PositiveIntegerField(null=True, blank=True)
    visibility = models.CharField(
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PRIVATE,
    )

    def __str__(self):
        return f"{self.user.nickname} - {self.book.title} quote"


class ReviewLike(models.Model):
    review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="review_likes",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="liked_reviews",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["review", "user"],
                name="unique_review_like_per_user",
            )
        ]

    def __str__(self):
        return f"{self.user.nickname} likes review {self.review_id}"


class Keyword(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class ReviewKeyword(models.Model):
    review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="review_keywords",
    )
    keyword = models.ForeignKey(
        "reviews.Keyword",
        on_delete=models.CASCADE,
        related_name="review_keywords",
    )
    weight = models.FloatField(default=0.0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["review", "keyword"],
                name="unique_review_keyword",
            )
        ]

    def __str__(self):
        return f"{self.review_id} - {self.keyword.name}"