# ai/predictors/rbti.py

"""
RBTI 최종 예측 모듈.

역할:
1. RI 모델로 수용형(R) / 탐구형(I) 예측
2. AE 모델로 분석형(A) / 공감형(E) 예측
3. NS 모델로 서사형(N) / 문장형(S) 예측
4. 세 축 결과를 합쳐 최종 RBTI 코드 생성

예:
RI = R
AE = A
NS = N
=> RBTI = RAN
"""

from ai.constants import (
    MODEL_VERSION,
    RBTI_TYPE_NAMES,
    SCORE_DECIMAL_PLACES,
)
from ai.predictors.ri import predict_ri
from ai.predictors.ae import predict_ae
from ai.predictors.ns import predict_ns


VALID_RI_LABELS = {"R", "I"}
VALID_AE_LABELS = {"A", "E"}
VALID_NS_LABELS = {"N", "S"}


def _round_score(value: float) -> float:
    """
    확률값을 0~100 점수로 변환한다.

    예:
    0.81234 -> 81.23
    """
    return round(float(value) * 100, SCORE_DECIMAL_PLACES)


def _round_confidence(value: float) -> float:
    """
    confidence 값을 보기 좋게 반올림한다.

    예:
    0.812345 -> 0.8123
    """
    return round(float(value), 4)


def _validate_axis_result(axis_name: str, label_code: str) -> None:
    """
    각 축의 label_code가 올바른지 검사한다.
    """
    if axis_name == "RI" and label_code not in VALID_RI_LABELS:
        raise ValueError(f"RI 예측 결과가 올바르지 않습니다: {label_code}")

    if axis_name == "AE" and label_code not in VALID_AE_LABELS:
        raise ValueError(f"AE 예측 결과가 올바르지 않습니다: {label_code}")

    if axis_name == "NS" and label_code not in VALID_NS_LABELS:
        raise ValueError(f"NS 예측 결과가 올바르지 않습니다: {label_code}")


def predict_rbti(text: str) -> dict:
    """
    리뷰 텍스트 하나를 받아 최종 RBTI를 예측한다.

    return 예시:
    {
        "rbti_code": "RAN",
        "rbti_name": "구조를 받아들이는 독해가",
        "confidence_score": 0.8123,
        "scores": {
            "receptive_score": 72.1,
            "inquiry_score": 27.9,
            "analytic_score": 81.3,
            "empathy_score": 18.7,
            "narrative_score": 64.2,
            "sentence_score": 35.8
        },
        "axes": {
            "ri": {...},
            "ae": {...},
            "ns": {...}
        }
    }
    """
    if not text or not text.strip():
        raise ValueError("RBTI 예측을 위한 리뷰 텍스트가 비어 있습니다.")

    text = text.strip()

    # 1. 축별 예측
    ri_result = predict_ri(text)
    ae_result = predict_ae(text)
    ns_result = predict_ns(text)

    # 2. 축별 라벨 추출
    ri_label = ri_result["label_code"]  # R 또는 I
    ae_label = ae_result["label_code"]  # A 또는 E
    ns_label = ns_result["label_code"]  # N 또는 S

    # 3. 라벨 검증
    _validate_axis_result("RI", ri_label)
    _validate_axis_result("AE", ae_label)
    _validate_axis_result("NS", ns_label)

    # 4. 최종 RBTI 코드 생성
    rbti_code = f"{ri_label}{ae_label}{ns_label}"

    # 5. 최종 RBTI 이름
    rbti_name = RBTI_TYPE_NAMES.get(rbti_code, "알 수 없는 RBTI 유형")

    # 6. 축별 확률을 DB 저장용 점수로 변환
    scores = {
        # RI
        "receptive_score": _round_score(ri_result["prob_R"]),
        "inquiry_score": _round_score(ri_result["prob_I"]),

        # AE
        "analytic_score": _round_score(ae_result["prob_A"]),
        "empathy_score": _round_score(ae_result["prob_E"]),

        # NS
        "narrative_score": _round_score(ns_result["prob_N"]),
        "sentence_score": _round_score(ns_result["prob_S"]),
    }

    # 7. 전체 confidence 계산
    # 세 축 confidence의 평균값 사용
    confidence_score = _round_confidence(
        (
            ri_result["confidence"]
            + ae_result["confidence"]
            + ns_result["confidence"]
        )
        / 3
    )

    return {
        "rbti_code": rbti_code,
        "rbti_name": rbti_name,
        "confidence_score": confidence_score,
        "model_version": MODEL_VERSION,

        # DB 저장용 점수
        "scores": scores,

        # 축별 요약
        "summary": {
            "ri": {
                "label_code": ri_label,
                "label": ri_result["label"],
                "confidence": _round_confidence(ri_result["confidence"]),
            },
            "ae": {
                "label_code": ae_label,
                "label": ae_result["label"],
                "confidence": _round_confidence(ae_result["confidence"]),
            },
            "ns": {
                "label_code": ns_label,
                "label": ns_result["label"],
                "confidence": _round_confidence(ns_result["confidence"]),
            },
        },

        # 디버깅/분석용 전체 결과
        # sentence_analysis까지 포함되어 있어서 개발 중 확인에 유용함
        "axes": {
            "ri": ri_result,
            "ae": ae_result,
            "ns": ns_result,
        },
    }


def predict_rbti_simple(text: str) -> dict:
    """
    프론트나 API 응답에서 가볍게 보여주고 싶을 때 사용하는 간단 버전.
    sentence_analysis 같은 긴 정보는 제외한다.
    """
    result = predict_rbti(text)

    return {
        "rbti_code": result["rbti_code"],
        "rbti_name": result["rbti_name"],
        "confidence_score": result["confidence_score"],
        "model_version": result["model_version"],
        "scores": result["scores"],
        "summary": result["summary"],
    }