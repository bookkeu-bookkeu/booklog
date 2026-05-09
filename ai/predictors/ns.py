# ai/predictors/ns.py

import re
import torch
import torch.nn.functional as F

from ai.loader import load_axis_model, DEVICE
from ai.constants import MAX_LENGTH, AXIS_THRESHOLDS


# =========================
# NS 문장 단위 단서 기반 보정 규칙
# N = 서사형
# S = 문장형
# =========================

N_CUES = [
    "이야기",
    "줄거리",
    "서사",
    "전개",
    "흐름",
    "사건",
    "장면들이",
    "인물",
    "주인공",
    "등장인물",
    "관계",
    "갈등",
    "결말",
    "과정",
    "변화",
    "성장",
    "전체 이야기",
    "전체 흐름",
    "이야기 전체",
    "책 전체",
    "처음부터 끝까지",
    "전반적으로",
    "구성",
    "구조",
    "이어진다",
    "펼쳐진다",
    "진행된다",
    "흘러간다",
    "서사가",
    "스토리",
    "플롯",
]

S_CUES = [
    "문장",
    "구절",
    "표현",
    "한 문장",
    "이 문장",
    "그 문장",
    "문구",
    "대사",
    "인용",
    "말",
    "단어",
    "한 구절",
    "짧은 문장",
    "마지막 문장",
    "첫 문장",
    "기억에 남는 문장",
    "인상 깊은 문장",
    "계속 떠오르는 문장",
    "계속 맴도는",
    "곱씹게",
    "밑줄",
    "필사",
    "적어두고 싶은",
    "오래 남는다",
    "머릿속에 남는다",
    "마음에 남는다",
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


def get_ns_base_prediction(text: str) -> tuple[int, float, float]:
    """
    KLUE-BERT NS 모델의 기본 예측 결과를 반환한다.

    return:
        base_pred: 0이면 N, 1이면 S
        prob_N: 서사형 확률
        prob_S: 문장형 확률
    """
    loaded = load_axis_model("NS")
    tokenizer = loaded["tokenizer"]
    model = loaded["model"]

    threshold = AXIS_THRESHOLDS.get("NS", 0.56)

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

    prob_N = float(probs[0].item())
    prob_S = float(probs[1].item())

    base_pred = 1 if prob_S >= threshold else 0

    return base_pred, prob_N, prob_S


def analyze_ns_sentences(text: str) -> list[dict]:
    """
    리뷰를 문장 단위로 나누어 N/S 단서를 분석한다.

    Django API 응답이나 DB 저장에 쓰기 쉽도록
    pandas DataFrame이 아니라 list[dict] 형태로 반환한다.
    """
    sentences = split_sentences(text)
    rows = []

    for idx, sentence in enumerate(sentences, start=1):
        n_count = count_cues(sentence, N_CUES)
        s_count = count_cues(sentence, S_CUES)

        if n_count > s_count:
            cue_label = "서사형(N)"
            cue_label_code = "N"
        elif s_count > n_count:
            cue_label = "문장형(S)"
            cue_label_code = "S"
        else:
            cue_label = "중립/불명확"
            cue_label_code = "NEUTRAL"

        rows.append(
            {
                "sentence_no": idx,
                "sentence": sentence,
                "n_cue_count": n_count,
                "s_cue_count": s_count,
                "cue_label": cue_label,
                "cue_label_code": cue_label_code,
            }
        )

    return rows


def predict_ns_with_context_rule(text: str) -> dict:
    """
    N/S 전용 최종 예측 함수.

    1. KLUE-BERT 모델로 기본 예측을 한다.
    2. 문장 단위로 N/S cue를 분석한다.
    3. cue가 강하게 반대 방향을 가리키면 예측을 보정한다.

    return:
        label_code: "N" 또는 "S"
        label: "서사형(N)" 또는 "문장형(S)"
        prob_N: 모델의 N 확률
        prob_S: 모델의 S 확률
        confidence: 최종 선택된 라벨의 확률
    """
    if not text or not text.strip():
        raise ValueError("NS 예측을 위한 리뷰 텍스트가 비어 있습니다.")

    text = text.strip()

    # 1. 전체 리뷰 기준 모델 기본 예측
    base_pred, prob_N, prob_S = get_ns_base_prediction(text)

    # 2. 문장 단위 cue 분석
    sentence_analysis = analyze_ns_sentences(text)

    n_sentence_count = sum(
        1 for row in sentence_analysis if row["cue_label_code"] == "N"
    )
    s_sentence_count = sum(
        1 for row in sentence_analysis if row["cue_label_code"] == "S"
    )

    total_n_cues = count_cues(text, N_CUES)
    total_s_cues = count_cues(text, S_CUES)

    # 3. 보정 규칙
    corrected_pred = base_pred
    correction_reason = "모델 예측 유지"

    # 모델은 S라고 했지만, N 단서가 훨씬 강하면 N으로 보정
    if base_pred == 1:
        if (
            n_sentence_count >= 2
            and total_n_cues >= total_s_cues + 2
            and total_n_cues >= 4
        ):
            corrected_pred = 0
            correction_reason = (
                "N/S 보정: 이야기 흐름·전개·인물 변화 중심 서술이 리뷰 중심"
            )

    # 모델은 N이라고 했지만, S 단서가 훨씬 강하면 S로 보정
    elif base_pred == 0:
        if (
            s_sentence_count >= 2
            and total_s_cues >= total_n_cues + 2
            and total_s_cues >= 4
        ):
            corrected_pred = 1
            correction_reason = (
                "N/S 보정: 특정 문장·구절·표현 중심 서술이 리뷰 중심"
            )

    confidence = prob_S if corrected_pred == 1 else prob_N

    label_code = "S" if corrected_pred == 1 else "N"
    label = "문장형(S)" if corrected_pred == 1 else "서사형(N)"

    base_label_code = "S" if base_pred == 1 else "N"
    base_label = "문장형(S)" if base_pred == 1 else "서사형(N)"

    return {
        "axis": "NS",

        # 최종 예측
        "pred": corrected_pred,
        "label_code": label_code,
        "label": label,
        "confidence": confidence,

        # 모델 확률
        "prob_N": prob_N,
        "prob_S": prob_S,

        # 모델 기본 예측
        "base_pred": base_pred,
        "base_label_code": base_label_code,
        "base_label": base_label,

        # 보정 정보
        "correction_reason": correction_reason,
        "n_sentence_count": int(n_sentence_count),
        "s_sentence_count": int(s_sentence_count),
        "total_n_cues": int(total_n_cues),
        "total_s_cues": int(total_s_cues),

        # 문장 단위 분석 결과
        "sentence_analysis": sentence_analysis,
    }


def predict_ns(text: str) -> dict:
    """
    외부에서 호출하기 쉬운 NS 예측 함수.
    rbti.py에서는 이 함수를 호출하면 된다.
    """
    return predict_ns_with_context_rule(text)