# ai/predictors/ae.py

import re
import torch
import torch.nn.functional as F

from ai.loader import load_axis_model, DEVICE
from ai.constants import MAX_LENGTH, AXIS_THRESHOLDS


# =========================
# AE 문장 단위 단서 기반 보정 규칙
# A = 분석형
# E = 공감형
# =========================

A_CUES = [
    "이 책은",
    "작품은",
    "작가는",
    "구성",
    "전개",
    "구조",
    "흐름",
    "설명",
    "정리",
    "사례",
    "개념",
    "논리",
    "장점",
    "단점",
    "주제",
    "메시지",
    "배치",
    "결말",
    "갈등",
    "관계 변화",
    "체계적",
    "안정적",
    "자연스럽게",
    "이해하기 쉽게",
    "전체적으로",
    "전체 구성",
]

E_CUES = [
    "나는",
    "내가",
    "나에게",
    "내 상황",
    "내 이야기",
    "마음",
    "감정",
    "공감",
    "위로",
    "먹먹",
    "울었다",
    "찡했다",
    "슬펐다",
    "아팠다",
    "떠올랐다",
    "겹쳐",
    "찔렸다",
    "와닿았다",
]


def split_sentences(text: str) -> list[str]:
    """
    리뷰 텍스트를 문장 단위로 나눈다.
    """
    text = text.strip()

    if not text:
        return []

    sentences = re.split(r"(?<=[.!?。！？])\s+|\n+", text)
    sentences = [sentence.strip() for sentence in sentences if sentence.strip()]

    return sentences if sentences else [text]


def count_cues(text: str, cues: list[str]) -> int:
    """
    텍스트 안에 cue 단어/표현이 몇 개 들어있는지 센다.
    """
    return sum(1 for cue in cues if cue in text)


def get_ae_base_prediction(text: str) -> tuple[int, float, float]:
    """
    KLUE-BERT AE 모델의 기본 예측 결과를 반환한다.

    return:
        base_pred: 0이면 A, 1이면 E
        prob_A: 분석형 확률
        prob_E: 공감형 확률
    """
    loaded = load_axis_model("AE")
    tokenizer = loaded["tokenizer"]
    model = loaded["model"]

    threshold = AXIS_THRESHOLDS.get("AE", 0.56)

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding="max_length",
        max_length=MAX_LENGTH,
    )

    inputs = {key: value.to(DEVICE) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probs = F.softmax(outputs.logits, dim=-1)[0]

    prob_A = float(probs[0].item())
    prob_E = float(probs[1].item())

    base_pred = 1 if prob_E >= threshold else 0

    return base_pred, prob_A, prob_E


def analyze_ae_sentences(text: str) -> list[dict]:
    """
    리뷰를 문장 단위로 나누어 A/E 단서를 분석한다.

    Django API 응답이나 DB 저장에 쓰기 쉽도록
    pandas DataFrame이 아니라 list[dict] 형태로 반환한다.
    """
    sentences = split_sentences(text)
    rows = []

    for idx, sentence in enumerate(sentences, start=1):
        a_count = count_cues(sentence, A_CUES)
        e_count = count_cues(sentence, E_CUES)

        if a_count > e_count:
            cue_label = "분석형(A)"
            cue_label_code = "A"
        elif e_count > a_count:
            cue_label = "공감형(E)"
            cue_label_code = "E"
        else:
            cue_label = "중립/불명확"
            cue_label_code = "NEUTRAL"

        rows.append(
            {
                "sentence_no": idx,
                "sentence": sentence,
                "a_cue_count": a_count,
                "e_cue_count": e_count,
                "cue_label": cue_label,
                "cue_label_code": cue_label_code,
            }
        )

    return rows


def predict_ae_with_context_rule(text: str) -> dict:
    """
    A/E 전용 최종 예측 함수.

    1. KLUE-BERT 모델로 기본 예측을 한다.
    2. 문장 단위로 A/E cue를 분석한다.
    3. cue가 강하게 반대 방향을 가리키면 예측을 보정한다.

    return:
        label_code: "A" 또는 "E"
        label: "분석형(A)" 또는 "공감형(E)"
        prob_A: 모델의 A 확률
        prob_E: 모델의 E 확률
        confidence: 최종 선택된 라벨의 확률
    """
    if not text or not text.strip():
        raise ValueError("AE 예측을 위한 리뷰 텍스트가 비어 있습니다.")

    text = text.strip()

    # 1. 전체 리뷰 기준 모델 기본 예측
    base_pred, prob_A, prob_E = get_ae_base_prediction(text)

    # 2. 문장 단위 cue 분석
    sentence_analysis = analyze_ae_sentences(text)

    a_sentence_count = sum(
        1 for row in sentence_analysis if row["cue_label_code"] == "A"
    )
    e_sentence_count = sum(
        1 for row in sentence_analysis if row["cue_label_code"] == "E"
    )

    total_a_cues = count_cues(text, A_CUES)
    total_e_cues = count_cues(text, E_CUES)

    # 3. 보정 규칙
    corrected_pred = base_pred
    correction_reason = "모델 예측 유지"

    # 모델은 E라고 했지만, A 단서가 훨씬 강하면 A로 보정
    if base_pred == 1:
        if (
            a_sentence_count >= 2
            and total_a_cues >= total_e_cues + 2
            and total_a_cues >= 4
        ):
            corrected_pred = 0
            correction_reason = (
                "A/E 보정: 책 구조·전개·구성 평가가 리뷰 중심"
            )

    # 모델은 A라고 했지만, E 단서가 훨씬 강하면 E로 보정
    elif base_pred == 0:
        if (
            e_sentence_count >= 2
            and total_e_cues >= total_a_cues + 2
            and total_e_cues >= 4
        ):
            corrected_pred = 1
            correction_reason = (
                "A/E 보정: 감정·경험 중심 서술이 리뷰 중심"
            )

    confidence = prob_E if corrected_pred == 1 else prob_A

    label_code = "E" if corrected_pred == 1 else "A"
    label = "공감형(E)" if corrected_pred == 1 else "분석형(A)"

    base_label_code = "E" if base_pred == 1 else "A"
    base_label = "공감형(E)" if base_pred == 1 else "분석형(A)"

    return {
        "axis": "AE",

        # 최종 예측
        "pred": corrected_pred,
        "label_code": label_code,
        "label": label,
        "confidence": confidence,

        # 모델 확률
        "prob_A": prob_A,
        "prob_E": prob_E,

        # 모델 기본 예측
        "base_pred": base_pred,
        "base_label_code": base_label_code,
        "base_label": base_label,

        # 보정 정보
        "correction_reason": correction_reason,
        "a_sentence_count": int(a_sentence_count),
        "e_sentence_count": int(e_sentence_count),
        "total_a_cues": int(total_a_cues),
        "total_e_cues": int(total_e_cues),

        # 문장 단위 분석 결과
        "sentence_analysis": sentence_analysis,
    }


def predict_ae(text: str) -> dict:
    """
    외부에서 호출하기 쉬운 AE 예측 함수.
    rbti.py에서는 이 함수를 호출하면 된다.
    """
    return predict_ae_with_context_rule(text)