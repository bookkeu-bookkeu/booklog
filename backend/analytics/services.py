import sys
import logging
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from analytics.models import ReviewAnalysisResult
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

    prediction = predict_rbti(review.content)
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
            "sentiment_score": _rating_to_sentiment_score(review.rating),
            "analytic_score": scores["receptive_score"],
            "immersion_score": scores["inquiry_score"],
            "critical_score": scores["analytic_score"],
            "empathy_score": scores["empathy_score"],
            "practical_score": scores["narrative_score"],
            "expansion_score": scores["sentence_score"],
            "inferred_rbti_type": rbti_type,
            "confidence_score": prediction["confidence_score"],
            "model_version": prediction["model_version"],
            "analyzed_at": timezone.now(),
        },
    )

    rebuild_user_rbti_from_review_analyses(review.user)
    return analysis_result


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


def _ensure_ai_package_path():
    project_root = Path(__file__).resolve().parents[2]
    project_root_path = str(project_root)
    if project_root_path not in sys.path:
        sys.path.insert(0, project_root_path)
