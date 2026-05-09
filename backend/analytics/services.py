import sys
from pathlib import Path

from django.db import transaction
from django.utils import timezone

from analytics.models import ReviewAnalysisResult
from rbti.models import RbtiType, UserRbtiSnapshot


DEFAULT_RBTI_UPDATE_ALPHA = 0.1
BOOSTED_RBTI_UPDATE_ALPHA = 0.15
BOOSTED_CONFIDENCE_THRESHOLD = 0.8
BOOSTED_REVIEW_LENGTH_THRESHOLD = 200


def analyze_review_and_update_user_rbti(review):
    _ensure_ai_package_path()
    from ai.predictors.rbti import predict_rbti

    prediction = predict_rbti(review.content)
    rbti_type = RbtiType.objects.filter(
        code=prediction["rbti_code"].strip().upper()
    ).first()
    scores = prediction["scores"]

    analysis_result = ReviewAnalysisResult.objects.create(
        review=review,
        sentiment_score=_rating_to_sentiment_score(review.rating),
        analytic_score=scores["receptive_score"],
        immersion_score=scores["inquiry_score"],
        critical_score=scores["analytic_score"],
        empathy_score=scores["empathy_score"],
        practical_score=scores["narrative_score"],
        expansion_score=scores["sentence_score"],
        inferred_rbti_type=rbti_type,
        confidence_score=prediction["confidence_score"],
        model_version=prediction["model_version"],
        analyzed_at=timezone.now(),
    )

    update_user_rbti_from_analysis(review.user, analysis_result, len(review.content.strip()))
    return analysis_result


@transaction.atomic
def update_user_rbti_from_analysis(user, analysis_result, review_length):
    current_snapshot = (
        UserRbtiSnapshot.objects.select_for_update()
        .select_related("rbti_type")
        .filter(user=user, is_current=True)
        .order_by("-created_at", "-id")
        .first()
    )

    alpha = DEFAULT_RBTI_UPDATE_ALPHA
    if (
        analysis_result.confidence_score >= BOOSTED_CONFIDENCE_THRESHOLD
        and review_length >= BOOSTED_REVIEW_LENGTH_THRESHOLD
    ):
        alpha = BOOSTED_RBTI_UPDATE_ALPHA

    score_fields = [
        "analytic_score",
        "immersion_score",
        "critical_score",
        "empathy_score",
        "practical_score",
        "expansion_score",
    ]
    if current_snapshot:
        new_scores = {
            field: _blend_score(
                getattr(current_snapshot, field),
                getattr(analysis_result, field),
                alpha,
            )
            for field in score_fields
        }
    else:
        new_scores = {
            field: _normalize_score(getattr(analysis_result, field))
            for field in score_fields
        }

    rbti_code = make_rbti_code_from_snapshot_scores(new_scores)
    rbti_type = RbtiType.objects.filter(code=rbti_code).first()
    if not rbti_type:
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
    first = "I" if scores["immersion_score"] > scores["analytic_score"] else "R"
    second = "E" if scores["empathy_score"] > scores["critical_score"] else "A"
    third = "S" if scores["expansion_score"] > scores["practical_score"] else "N"
    return first + second + third


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
