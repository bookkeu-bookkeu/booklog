# ai/predictors/ri.py

import re
import torch
import torch.nn.functional as F

from ai.loader import load_axis_model, DEVICE
from ai.constants import MAX_LENGTH, AXIS_THRESHOLDS


# =========================
# RI 문장 단위 단서 기반 보정 규칙
# R = 수용형
# I = 탐구형
# =========================

R_CUES = [
    "이해할 수 있었다",
    "이해하기 쉬웠다",
    "이해 됐다",
    "잘 설명",
    "잘 정리",
    "도움이 되었다",
    "유익했다",
    "납득",
    "공감할 수 있었다",
    "받아들일 수 있었다",
    "설득력 있었다",
    "좋은 내용",
    "명확하다",
    "쉽게 설명",
    "알 수 있었다",
    "배울 수 있었다",
    "필요한 책",
    "추천하고 싶다",
    "의미 있었다",
    "잘 전달",
    "핵심을 알려준다",
    "중요성을 알게 되었다",
    "설명한다",
]

I_CUES = [
    "왜",
    "의문",
    "궁금",
    "질문",
    "생각해볼",
    "고민하게",
    "다른 관점",
    "다르게 볼",
    "정말",
    "과연",
    "항상 맞는지",
    "적용될 수 있는지",
    "한계",
    "비판",
    "반문",
    "의심",
    "더 알고 싶다",
    "더 생각",
    "다른 해석",
    "가능할까",
    "타당한지",
    "맞는 말인지",
    "확실하지 않다",
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


def get_ri_base_prediction(text: str) -> tuple[int, float, float]:
    """
    KLUE-BERT RI 모델의 기본 예측 결과를 반환한다.

    return:
        base_pred: 0이면 R, 1이면 I
        prob_R: 수용형 확률
        prob_I: 탐구형 확률
    """
    loaded = load_axis_model("RI")
    tokenizer = loaded["tokenizer"]
    model = loaded["model"]

    threshold = AXIS_THRESHOLDS.get("RI", 0.56)

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

    prob_R = float(probs[0].item())
    prob_I = float(probs[1].item())

    base_pred = 1 if prob_I >= threshold else 0

    return base_pred, prob_R, prob_I


def analyze_ri_sentences(text: str) -> list[dict]:
    """
    리뷰를 문장 단위로 나누어 R/I 단서를 분석한다.

    Django API 응답이나 DB 저장에 쓰기 쉽도록
    pandas DataFrame이 아니라 list[dict] 형태로 반환한다.
    """
    sentences = split_sentences(text)
    rows = []

    for idx, sentence in enumerate(sentences, start=1):
        r_count = count_cues(sentence, R_CUES)
        i_count = count_cues(sentence, I_CUES)

        if r_count > i_count:
            cue_label = "수용형(R)"
            cue_label_code = "R"
        elif i_count > r_count:
            cue_label = "탐구형(I)"
            cue_label_code = "I"
        else:
            cue_label = "중립/불명확"
            cue_label_code = "NEUTRAL"

        rows.append(
            {
                "sentence_no": idx,
                "sentence": sentence,
                "r_cue_count": r_count,
                "i_cue_count": i_count,
                "cue_label": cue_label,
                "cue_label_code": cue_label_code,
            }
        )

    return rows


def predict_ri_with_context_rule(text: str) -> dict:
    """
    R/I 전용 최종 예측 함수.

    1. KLUE-BERT 모델로 기본 예측을 한다.
    2. 문장 단위로 R/I cue를 분석한다.
    3. cue가 강하게 반대 방향을 가리키면 예측을 보정한다.

    return:
        label_code: "R" 또는 "I"
        label: "수용형(R)" 또는 "탐구형(I)"
        prob_R: 모델의 R 확률
        prob_I: 모델의 I 확률
        confidence: 최종 선택된 라벨의 확률
    """
    if not text or not text.strip():
        raise ValueError("RI 예측을 위한 리뷰 텍스트가 비어 있습니다.")

    text = text.strip()

    # 1. 전체 리뷰 기준 모델 기본 예측
    base_pred, prob_R, prob_I = get_ri_base_prediction(text)

    # 2. 문장 단위 cue 분석
    sentence_analysis = analyze_ri_sentences(text)

    r_sentence_count = sum(
        1 for row in sentence_analysis if row["cue_label_code"] == "R"
    )
    i_sentence_count = sum(
        1 for row in sentence_analysis if row["cue_label_code"] == "I"
    )

    total_r_cues = count_cues(text, R_CUES)
    total_i_cues = count_cues(text, I_CUES)

    # 3. 보정 규칙
    corrected_pred = base_pred
    correction_reason = "모델 예측 유지"

    # 모델은 I라고 했지만, R 단서가 훨씬 강하면 R로 보정
    if base_pred == 1:
        if (
            r_sentence_count >= 2
            and total_r_cues >= total_i_cues + 2
            and total_r_cues >= 4
        ):
            corrected_pred = 0
            correction_reason = (
                "R/I 보정: 책의 주장·내용을 받아들이는 수용 서술이 리뷰 중심"
            )

    # 모델은 R이라고 했지만, I 단서가 훨씬 강하면 I로 보정
    elif base_pred == 0:
        if (
            i_sentence_count >= 2
            and total_i_cues >= total_r_cues + 2
            and total_i_cues >= 4
        ):
            corrected_pred = 1
            correction_reason = (
                "R/I 보정: 질문·의문·확장적 사고가 리뷰 중심"
            )

    confidence = prob_I if corrected_pred == 1 else prob_R

    label_code = "I" if corrected_pred == 1 else "R"
    label = "탐구형(I)" if corrected_pred == 1 else "수용형(R)"

    base_label_code = "I" if base_pred == 1 else "R"
    base_label = "탐구형(I)" if base_pred == 1 else "수용형(R)"

    return {
        "axis": "RI",

        # 최종 예측
        "pred": corrected_pred,
        "label_code": label_code,
        "label": label,
        "confidence": confidence,

        # 모델 확률
        "prob_R": prob_R,
        "prob_I": prob_I,

        # 모델 기본 예측
        "base_pred": base_pred,
        "base_label_code": base_label_code,
        "base_label": base_label,

        # 보정 정보
        "correction_reason": correction_reason,
        "r_sentence_count": int(r_sentence_count),
        "i_sentence_count": int(i_sentence_count),
        "total_r_cues": int(total_r_cues),
        "total_i_cues": int(total_i_cues),

        # 문장 단위 분석 결과
        "sentence_analysis": sentence_analysis,
    }


def predict_ri(text: str) -> dict:
    """
    외부에서 호출하기 쉬운 RI 예측 함수.
    rbti.py에서는 이 함수를 호출하면 된다.
    """
    return predict_ri_with_context_rule(text)