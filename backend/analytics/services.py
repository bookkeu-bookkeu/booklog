import sys
import logging
from pathlib import Path

from django.db import transaction
from django.db.models import Avg, Count, FloatField
from django.db.models.functions import Cast
from django.utils import timezone

from analytics.models import BookRbtiStat, ReviewAnalysisResult
from reviews.models import Review
from rbti.models import RbtiType, UserRbtiSnapshot

logger = logging.getLogger(__name__)


DEFAULT_RBTI_UPDATE_ALPHA = 0.1
BOOSTED_RBTI_UPDATE_ALPHA = 0.15
MIN_REVIEW_LENGTH_FOR_RBTI_UPDATE = 30
MIN_CONFIDENCE_FOR_RBTI_UPDATE = 0.6
BOOSTED_CONFIDENCE_THRESHOLD = 0.8
BOOSTED_REVIEW_LENGTH_THRESHOLD = 200


def analyze_review_and_update_user_rbti(review):
    _ensure_ai_package_path()
    from ai.predictors.rbti import predict_rbti
    from ai.predictors.sentiment import (
        analyze_review_sentiment,
        fallback_review_sentiment_from_rating,
    )

    prediction = predict_rbti(review.content)
    try:
        sentiment = analyze_review_sentiment(review.content, review.rating)
    except Exception:
        logger.exception(
            "Failed to analyze review sentiment. Falling back to rating: review_id=%s",
            review.id,
        )
        sentiment = fallback_review_sentiment_from_rating(review.rating)

    rbti_type = RbtiType.objects.filter(
        code=prediction["rbti_code"].strip().upper()
    ).first()
    if not rbti_type:
        logger.warning(
            "Predicted RBTI type does not exist: review_id=%s rbti_code=%s",
            review.id,
            prediction["rbti_code"],
        )
    scores = prediction["scores"]

    analysis_result, _ = ReviewAnalysisResult.objects.update_or_create(
        review=review,
        defaults={
            "sentiment_score": _normalize_score(
                sentiment["final_positive_score"] * 100
            ),
            "analytic_score": scores["receptive_score"],
            "immersion_score": scores["inquiry_score"],
            "critical_score": scores["analytic_score"],
            "empathy_score": scores["empathy_score"],
            "practical_score": scores["narrative_score"],
            "expansion_score": scores["sentence_score"],
            "inferred_rbti_type": rbti_type,
            "confidence_score": prediction["confidence_score"],
            "model_version": f"{prediction['model_version']}|sentiment-v1",
            "analyzed_at": timezone.now(),
        },
    )

    rebuild_user_rbti_from_review_analyses(review.user)
    rebuild_book_rbti_stats(review.book_id)
    return analysis_result


def save_rating_based_review_analysis(review):
    current_snapshot = (
        UserRbtiSnapshot.objects.select_related("rbti_type")
        .filter(user=review.user, is_current=True)
        .order_by("-created_at", "-id")
        .first()
    )

    if not current_snapshot:
        rebuild_book_rbti_stats(review.book_id)
        return None

    analysis_result, _ = ReviewAnalysisResult.objects.update_or_create(
        review=review,
        defaults={
            "sentiment_score": _rating_to_sentiment_score(review.rating),
            "analytic_score": current_snapshot.analytic_score,
            "immersion_score": current_snapshot.immersion_score,
            "critical_score": current_snapshot.critical_score,
            "empathy_score": current_snapshot.empathy_score,
            "practical_score": current_snapshot.practical_score,
            "expansion_score": current_snapshot.expansion_score,
            "inferred_rbti_type": current_snapshot.rbti_type,
            "confidence_score": 1.0,
            "model_version": "rating-fallback-v1",
            "analyzed_at": timezone.now(),
        },
    )
    rebuild_book_rbti_stats(review.book_id)
    return analysis_result


@transaction.atomic
def rebuild_book_rbti_stats(book_id):
    BookRbtiStat.objects.select_for_update().filter(book_id=book_id).delete()

    grouped_stats = (
        ReviewAnalysisResult.objects.select_related("review", "review__user", "inferred_rbti_type")
        .filter(
            review__book_id=book_id,
            review__visibility=Review.VISIBILITY_PUBLIC,
            review__user__rbti_snapshots__is_current=True,
        )
        .values("review__user__rbti_snapshots__rbti_type")
        .annotate(
            review_count=Count("id"),
            avg_review_score=Avg(Cast("review__rating", FloatField())),
            positive_ratio=Avg("sentiment_score"),
        )
    )

    now = timezone.now()
    for stat in grouped_stats:
        rbti_type_id = stat["review__user__rbti_snapshots__rbti_type"]
        if not rbti_type_id:
            continue

        positive_ratio = round(float(stat["positive_ratio"] or 0), 2)
        review_count = int(stat["review_count"] or 0)
        representative = (
            ReviewAnalysisResult.objects.select_related("review", "review__user")
            .filter(
                review__book_id=book_id,
                review__visibility=Review.VISIBILITY_PUBLIC,
                review__user__rbti_snapshots__is_current=True,
                review__user__rbti_snapshots__rbti_type_id=rbti_type_id,
            )
            .order_by("-sentiment_score", "-review__like_count", "-review__created_at", "-review_id")
            .first()
        )

        BookRbtiStat.objects.create(
            book_id=book_id,
            rbti_type_id=rbti_type_id,
            review_count=review_count,
            avg_review_score=round(float(stat["avg_review_score"] or 0), 2),
            positive_ratio=positive_ratio,
            weighted_score=round(positive_ratio * _review_count_weight(review_count), 2),
            representative_review=representative.review if representative else None,
            calculated_at=now,
        )


def get_top_positive_rbti_for_book(book_id):
    if not BookRbtiStat.objects.filter(book_id=book_id).exists():
        rebuild_book_rbti_stats(book_id)

    return (
        BookRbtiStat.objects.select_related(
            "rbti_type",
            "representative_review",
            "representative_review__user",
        )
        .filter(book_id=book_id, review_count__gt=0)
        .order_by("-positive_ratio", "-review_count", "rbti_type__code")
        .first()
    )


@transaction.atomic
def rebuild_user_rbti_from_review_analyses(user):
    UserRbtiSnapshot.objects.select_for_update().filter(
        user=user,
        source_type=UserRbtiSnapshot.SOURCE_AI_REVIEW,
    ).delete()

    base_snapshot = (
        UserRbtiSnapshot.objects.select_for_update()
        .select_related("rbti_type")
        .filter(user=user)
        .exclude(source_type=UserRbtiSnapshot.SOURCE_AI_REVIEW)
        .order_by("-created_at", "-id")
        .first()
    )

    UserRbtiSnapshot.objects.filter(user=user, is_current=True).update(is_current=False)
    if not base_snapshot:
        return None

    base_snapshot.is_current = True
    base_snapshot.save(update_fields=["is_current"])

    analysis_results = (
        ReviewAnalysisResult.objects.select_related("review", "review__user")
        .filter(review__user=user)
        .filter(analyzed_at__gte=base_snapshot.created_at)
        .order_by("analyzed_at", "id")
    )

    current_snapshot = base_snapshot
    for analysis_result in analysis_results:
        current_snapshot = update_user_rbti_from_analysis(
            user,
            analysis_result,
            len(analysis_result.review.content.strip()),
        ) or current_snapshot

    return current_snapshot


def update_user_rbti_from_analysis(user, analysis_result, review_length):
    if review_length < MIN_REVIEW_LENGTH_FOR_RBTI_UPDATE:
        return None

    if analysis_result.confidence_score < MIN_CONFIDENCE_FOR_RBTI_UPDATE:
        return None

    current_snapshot = (
        UserRbtiSnapshot.objects.select_for_update()
        .select_related("rbti_type")
        .filter(user=user, is_current=True)
        .order_by("-created_at", "-id")
        .first()
    )

    if not current_snapshot:
        return None

    alpha = DEFAULT_RBTI_UPDATE_ALPHA
    if (
        analysis_result.confidence_score >= BOOSTED_CONFIDENCE_THRESHOLD
        and review_length >= BOOSTED_REVIEW_LENGTH_THRESHOLD
    ):
        alpha = BOOSTED_RBTI_UPDATE_ALPHA

    blended_scores = {
        field: _blend_score(
            getattr(current_snapshot, field),
            getattr(analysis_result, field),
            alpha,
        )
        for field in [
            "analytic_score",
            "immersion_score",
            "critical_score",
            "empathy_score",
            "practical_score",
            "expansion_score",
        ]
    }
    new_scores = _normalize_axis_score_pairs(blended_scores)

    rbti_code = make_rbti_code_from_snapshot_scores(new_scores)
    rbti_type = RbtiType.objects.filter(code=rbti_code).first()
    if not rbti_type:
        logger.warning(
            "Blended RBTI type does not exist: user_id=%s rbti_code=%s analysis_result_id=%s",
            user.id,
            rbti_code,
            analysis_result.id,
        )
        return None

    UserRbtiSnapshot.objects.filter(user=user, is_current=True).update(is_current=False)

    return UserRbtiSnapshot.objects.create(
        user=user,
        rbti_type=rbti_type,
        source_type=UserRbtiSnapshot.SOURCE_AI_REVIEW,
        source_ref_id=analysis_result.review_id,
        is_current=True,
        **new_scores,
    )


def make_rbti_code_from_snapshot_scores(scores):
    first = "I" if scores["immersion_score"] >= 50 else "R"
    second = "E" if scores["empathy_score"] >= 50 else "A"
    third = "S" if scores["expansion_score"] >= 50 else "N"
    return first + second + third


def _normalize_axis_score_pairs(scores):
    normalized_scores = dict(scores)
    axis_pairs = [
        ("analytic_score", "immersion_score"),
        ("critical_score", "empathy_score"),
        ("practical_score", "expansion_score"),
    ]

    for left_field, right_field in axis_pairs:
        left_score, right_score = _normalize_score_pair(
            normalized_scores[left_field],
            normalized_scores[right_field],
        )
        normalized_scores[left_field] = left_score
        normalized_scores[right_field] = right_score

    return normalized_scores


def _normalize_score_pair(left_score, right_score):
    total = left_score + right_score
    if total <= 0:
        return 50, 50

    left_percentage = _normalize_score((left_score / total) * 100)
    right_percentage = 100 - left_percentage
    return left_percentage, right_percentage


def _blend_score(old_score, ai_score, alpha):
    blended = old_score * (1 - alpha) + ai_score * alpha
    return _normalize_score(blended)


def _normalize_score(score):
    return max(0, min(100, round(score)))


def _rating_to_sentiment_score(rating):
    return round((rating / 5) * 100, 2)


def _review_count_weight(review_count):
    return min(1.0, max(review_count, 1) / 5)


def _ensure_ai_package_path():
    project_root = Path(__file__).resolve().parents[2]
    project_root_path = str(project_root)
    if project_root_path not in sys.path:
        sys.path.insert(0, project_root_path)
