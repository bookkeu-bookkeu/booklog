# analytics/models.py

from django.db import models


class ReviewAnalysisResult(models.Model):
    review = models.OneToOneField(
        "reviews.Review",
        on_delete=models.CASCADE,
        related_name="analysis_result",
    )
    sentiment_score = models.FloatField()
    analytic_score = models.FloatField()
    immersion_score = models.FloatField()
    critical_score = models.FloatField()
    empathy_score = models.FloatField()
    practical_score = models.FloatField()
    expansion_score = models.FloatField()
    inferred_rbti_type = models.ForeignKey(
        "rbti.RbtiType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="review_analysis_results",
    )
    confidence_score = models.FloatField()
    model_version = models.CharField(max_length=50)
    analyzed_at = models.DateTimeField()

    def __str__(self):
        return f"analysis for review {self.review_id}"


class BookRbtiStat(models.Model):
    book = models.ForeignKey(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="rbti_stats",
    )
    rbti_type = models.ForeignKey(
        "rbti.RbtiType",
        on_delete=models.CASCADE,
        related_name="book_stats",
    )
    review_count = models.PositiveIntegerField(default=0)
    avg_review_score = models.FloatField(default=0.0)
    positive_ratio = models.FloatField(default=0.0)
    weighted_score = models.FloatField(default=0.0)
    representative_review = models.ForeignKey(
        "reviews.Review",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="representative_in_stats",
    )
    calculated_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["book", "rbti_type"],
                name="unique_book_rbti_stat",
            )
        ]

    def __str__(self):
        return f"{self.book.title} - {self.rbti_type.code}"