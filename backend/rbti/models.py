# rbti/models.py

from django.db import models


class RbtiType(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    axis_1 = models.CharField(max_length=30)
    axis_2 = models.CharField(max_length=30)
    axis_3 = models.CharField(max_length=30)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class UserRbtiSnapshot(models.Model):
    SOURCE_SURVEY = "survey"
    SOURCE_AI_REVIEW = "ai_review"
    SOURCE_MANUAL_RESET = "manual_reset"

    SOURCE_CHOICES = [
        (SOURCE_SURVEY, "Survey"),
        (SOURCE_AI_REVIEW, "AI Review"),
        (SOURCE_MANUAL_RESET, "Manual Reset"),
    ]

    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="rbti_snapshots",
    )
    rbti_type = models.ForeignKey(
        "rbti.RbtiType",
        on_delete=models.PROTECT,
        related_name="user_snapshots",
    )
    analytic_score = models.PositiveSmallIntegerField()
    immersion_score = models.PositiveSmallIntegerField()
    critical_score = models.PositiveSmallIntegerField()
    empathy_score = models.PositiveSmallIntegerField()
    practical_score = models.PositiveSmallIntegerField()
    expansion_score = models.PositiveSmallIntegerField()
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_ref_id = models.PositiveIntegerField(null=True, blank=True)
    is_current = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.nickname} - {self.rbti_type.code}"


class RbtiSurveyQuestion(models.Model):
    AXIS_ANALYTIC_IMMERSION = "analytic_immersion"
    AXIS_CRITICAL_EMPATHY = "critical_empathy"
    AXIS_PRACTICAL_EXPANSION = "practical_expansion"

    AXIS_CHOICES = [
        (AXIS_ANALYTIC_IMMERSION, "Analytic / Immersion"),
        (AXIS_CRITICAL_EMPATHY, "Critical / Empathy"),
        (AXIS_PRACTICAL_EXPANSION, "Practical / Expansion"),
    ]

    question_text = models.TextField()
    axis_type = models.CharField(max_length=30, choices=AXIS_CHOICES)
    order_no = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order_no", "id"]

    def __str__(self):
        return f"{self.order_no}. {self.question_text[:20]}"


class RbtiSurveySession(models.Model):
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="rbti_survey_sessions",
    )
    rbti_type = models.ForeignKey(
        "rbti.RbtiType",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="survey_sessions",
    )
    analytic_score = models.PositiveSmallIntegerField()
    immersion_score = models.PositiveSmallIntegerField()
    critical_score = models.PositiveSmallIntegerField()
    empathy_score = models.PositiveSmallIntegerField()
    practical_score = models.PositiveSmallIntegerField()
    expansion_score = models.PositiveSmallIntegerField()
    is_retest = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.nickname} survey #{self.id}"


class RbtiSurveyAnswer(models.Model):
    session = models.ForeignKey(
        "rbti.RbtiSurveySession",
        on_delete=models.CASCADE,
        related_name="answers",
    )
    question = models.ForeignKey(
        "rbti.RbtiSurveyQuestion",
        on_delete=models.CASCADE,
        related_name="answers",
    )
    answer_value = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["session", "question"],
                name="unique_answer_per_question_in_session",
            )
        ]

    def __str__(self):
        return f"session={self.session_id}, question={self.question_id}"