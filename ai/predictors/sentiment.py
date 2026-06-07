"""
Review sentiment predictor.

This module is the cleaned project version of the Colab sentiment notebook.
It exposes small Python functions that can be called from Django services
without notebook-only commands, display calls, pandas dataframes, or test data.
"""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Iterable

import numpy as np
import torch
import torch.nn.functional as F
from transformers import AutoModelForSequenceClassification, AutoTokenizer


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

SENTIMENT_MODEL_NAME = "Copycats/koelectra-base-v3-generalized-sentiment-analysis"
SENTIMENT_MODEL_VERSION = f"{SENTIMENT_MODEL_NAME}:project-v1"

MAX_LENGTH = 256
TOKEN_CHUNK_SIZE = 220
TOKEN_CHUNK_OVERLAP = 40
BATCH_SIZE = 16

AMBIGUOUS_MARGIN = 0.10
ENDING_BOOST = 1.8
ENDING_UNIT_COUNT = 2

FINAL_POSITIVE_THRESHOLD = 0.20
FINAL_NEGATIVE_THRESHOLD = -0.20

DEFAULT_NEGATIVE_INDEX = 0
DEFAULT_POSITIVE_INDEX = 1


IMMERSION_POSITIVE_PATTERNS = [
    r"시간\s*가는\s*줄\s*모르",
    r"손에서\s*놓",
    r"놓질\s*못",
    r"멈출\s*수\s*없",
    r"계속\s*읽",
    r"술술\s*읽",
    r"몰입",
    r"빠져들",
    r"새벽",
    r"밤\s*새",
    r"잠을?\s*못\s*자",
    r"잠\s*못\s*자",
    r"주말.{0,10}날아",
    r"통째로\s*날아",
    r"중독되게\s*만드는\s*재능",
    r"중독",
]

SARCASTIC_PRAISE_PATTERNS = [
    r"최고",
    r"최고의",
    r"대단",
    r"대단한",
    r"훌륭",
    r"완벽",
    r"명작",
    r"레전드",
    r"역대급",
    r"진짜\s*미쳤",
    r"정말\s*미쳤",
    r"와\s*진짜",
    r"와\s*정말",
    r"감탄",
    r"놀랍",
    r"쉽지\s*않은데\s*(그걸|이걸)?\s*해냈",
    r"(그걸|이걸)\s*해냈",
]

NEGATIVE_EXPERIENCE_PATTERNS = [
    r"졸았",
    r"졸림",
    r"졸려",
    r"잠\s*왔",
    r"잠이\s*왔",
    r"꾸벅",
    r"하품",
    r"지루",
    r"재미없",
    r"재미\s*없",
    r"안\s*읽히",
    r"읽히지\s*않",
    r"끝까지\s*안\s*읽히",
    r"끝까지\s*읽기\s*힘들",
    r"읽기\s*힘들",
    r"집중\s*안",
    r"몰입\s*안",
    r"돈.{0,10}아깝",
    r"돈이.{0,10}아깝",
    r"시간.{0,10}아깝",
    r"시간.{0,10}낭비",
    r"시간\s*삭제\s*당",
    r"후회",
    r"별로",
    r"실망",
    r"최악",
    r"억지",
    r"이해할\s*수\s*없",
    r"추천하고\s*싶진\s*않",
    r"다시\s*(읽|보).{0,10}같진\s*않",
]

HARD_HARM_PATTERNS = [
    r"일상.{0,15}무너",
    r"생활.{0,15}무너",
    r"위험",
    r"폐인",
    r"망했다",
    r"큰일\s*났",
    r"부작용",
]

NEGATIVE_FINAL_PATTERNS = [
    r"(다시는|다신).{0,80}말아야",
    r"(다시는|다신).{0,80}(사|살|구매|읽|보|추천|찾|집어들).{0,40}(않겠|않을|안\s*하|못\s*하|싫|말|말아야)",
    r"(사지|구매하지|읽지|보지|추천하지)\s*(말아야|않겠|않을|말자|않는|안)",
    r"(안|못)\s*(사|살|구매|읽|보|추천).{0,20}(겠다|것\s*같|듯|생각)",
    r"(비추천|추천\s*못|추천\s*안|추천하지)",
    r"(돈\s*아깝|시간\s*낭비|괜히.{0,15}(읽|샀|봤)|후회(된다|했다|스럽|한다)|최악|실망|별로|짜증|화가?\s*난다)",
]

NEGATIVE_FINAL_NOSPACE_PATTERNS = [
    r"(다시는|다신).{0,80}(사지|사면|구매하지|읽지|보지|추천하지|찾지).{0,40}(말아야|않겠|않을|안되|안돼|말자)",
    r"(사지|구매하지|읽지|보지|추천하지).{0,30}(말아야|않겠|않을|말자|안되|안돼)",
    r"(비추천|추천못|추천안|추천하지)",
    r"(돈아깝|시간낭비|후회된다|후회했다|최악|실망|별로|짜증)",
]

POSITIVE_EXCEPTION_PATTERNS = [
    r"추천하지\s*않을\s*수\s*없",
    r"(사지|구매하지|읽지|보지|추천하지)\s*않을\s*수\s*없",
    r"안\s*(살|사|읽|볼|추천할)\s*수\s*가?\s*없",
    r"놓칠\s*수\s*없",
    r"놓치지\s*말아야",
    r"(또|다시).{0,20}(읽|사|살|구매|찾).{0,20}(싶|예정|겠다|해야)",
    r"계속.{0,20}(읽|사|살|구매|찾)",
    r"기다릴\s*것\s*같",
    r"괜찮은\s*편",
]

POSITIVE_EXCEPTION_NOSPACE_PATTERNS = [
    r"추천하지않을수없",
    r"(사지|구매하지|읽지|보지|추천하지)않을수없",
    r"안(살|사|읽|볼|추천할)수가?없",
    r"놓칠수없",
    r"놓치지말아야",
]

PURCHASE_REJECTION_PATTERNS = [
    r"(다시는|다신).{0,80}(사|살|구매).{0,40}(말아야|않겠|않을|안\s*하|못\s*하)",
    r"(사지|구매하지)\s*(말아야|않겠|않을|말자|않는|안)",
]


def clean_text(text) -> str:
    if text is None:
        return ""

    text = str(text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_sentences(text) -> list[str]:
    text = clean_text(text)
    if not text:
        return []

    sentences = re.split(r"(?<=[.!?。！？])\s+|\n+", text)
    sentences = [sentence.strip() for sentence in sentences if sentence.strip()]
    return sentences or [text]


def normalize_no_space(text) -> str:
    return re.sub(r"\s+", "", clean_text(text).lower())


@lru_cache(maxsize=1)
def load_sentiment_model() -> dict:
    tokenizer = AutoTokenizer.from_pretrained(SENTIMENT_MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(SENTIMENT_MODEL_NAME)
    model.to(DEVICE)
    model.eval()

    negative_index, positive_index = get_label_indices(model)

    return {
        "tokenizer": tokenizer,
        "model": model,
        "negative_index": negative_index,
        "positive_index": positive_index,
    }


def get_label_indices(model) -> tuple[int, int]:
    id2label = model.config.id2label
    negative_index = None
    positive_index = None

    for idx, label in id2label.items():
        label_lower = str(label).lower()

        if "neg" in label_lower or "negative" in label_lower or "부정" in label_lower:
            negative_index = int(idx)

        if "pos" in label_lower or "positive" in label_lower or "긍정" in label_lower:
            positive_index = int(idx)

    return (
        DEFAULT_NEGATIVE_INDEX if negative_index is None else negative_index,
        DEFAULT_POSITIVE_INDEX if positive_index is None else positive_index,
    )


def split_long_text_by_tokens(text, tokenizer) -> list[dict]:
    text = clean_text(text)
    token_ids = tokenizer.encode(text, add_special_tokens=False)

    if len(token_ids) <= TOKEN_CHUNK_SIZE:
        return [
            {
                "text": text,
                "token_count": len(token_ids),
                "weight_token_count": max(len(token_ids), 1),
            }
        ]

    chunks = []
    step = max(TOKEN_CHUNK_SIZE - TOKEN_CHUNK_OVERLAP, 1)
    start = 0
    chunk_index = 1

    while start < len(token_ids):
        end = min(start + TOKEN_CHUNK_SIZE, len(token_ids))
        chunk_ids = token_ids[start:end]
        chunk_text = tokenizer.decode(
            chunk_ids,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True,
        ).strip()

        if chunk_text:
            raw_token_count = len(chunk_ids)
            weight_token_count = (
                raw_token_count
                if chunk_index == 1
                else max(raw_token_count - TOKEN_CHUNK_OVERLAP, 1)
            )
            chunks.append(
                {
                    "text": chunk_text,
                    "token_count": raw_token_count,
                    "weight_token_count": weight_token_count,
                }
            )

        if end >= len(token_ids):
            break

        start += step
        chunk_index += 1

    return chunks


def make_analysis_units(review_text, tokenizer) -> list[dict]:
    rows = []
    unit_id = 1

    for sentence_id, sentence in enumerate(split_sentences(review_text), start=1):
        for chunk_id, chunk in enumerate(split_long_text_by_tokens(sentence, tokenizer), start=1):
            rows.append(
                {
                    "unit_id": unit_id,
                    "sentence_id": sentence_id,
                    "chunk_id": chunk_id,
                    **chunk,
                }
            )
            unit_id += 1

    return rows


def predict_units_sentiment(units: list[dict], batch_size=BATCH_SIZE) -> list[dict]:
    if not units:
        return []

    loaded = load_sentiment_model()
    tokenizer = loaded["tokenizer"]
    model = loaded["model"]
    negative_index = loaded["negative_index"]
    positive_index = loaded["positive_index"]
    results = []
    texts = [unit["text"] for unit in units]

    for start in range(0, len(texts), batch_size):
        batch_texts = texts[start : start + batch_size]
        inputs = tokenizer(
            batch_texts,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=MAX_LENGTH,
        ).to(DEVICE)

        with torch.no_grad():
            logits = model(**inputs).logits
            probs = F.softmax(logits, dim=-1).detach().cpu().numpy()

        for index, text in enumerate(batch_texts):
            unit = dict(units[start + index])
            negative_prob = float(probs[index][negative_index])
            positive_prob = float(probs[index][positive_index])
            is_positive = positive_prob >= negative_prob

            unit.update(
                {
                    "text": text,
                    "negative_prob": negative_prob,
                    "positive_prob": positive_prob,
                    "unit_label": "positive" if is_positive else "negative",
                    "confidence": positive_prob if is_positive else negative_prob,
                    "positive_margin": positive_prob - negative_prob,
                    "negative_margin": negative_prob - positive_prob,
                }
            )
            results.append(unit)

    return results


def regex_matches(patterns: Iterable[str], text) -> list[str]:
    text = clean_text(text)
    matches = []

    for pattern in patterns:
        matches.extend(
            match.group(0)
            for match in re.finditer(pattern, text, flags=re.IGNORECASE)
        )

    return matches


def regex_matches_no_space(patterns: Iterable[str], text) -> list[str]:
    text_no_space = normalize_no_space(text)
    matches = []

    for pattern in patterns:
        matches.extend(
            match.group(0)
            for match in re.finditer(pattern, text_no_space, flags=re.IGNORECASE)
        )

    return matches


def get_last_portion(text, sentence_count=3, max_chars=500) -> str:
    text = clean_text(text)
    sentences = split_sentences(text)
    last_text = " ".join(sentences[-sentence_count:]) if sentences else text[-max_chars:]
    return last_text[-max_chars:].strip()


def detect_context_negative(review_text) -> dict:
    text = clean_text(review_text)
    last_text = get_last_portion(text)

    immersion_matches = regex_matches(IMMERSION_POSITIVE_PATTERNS, text)
    praise_matches = regex_matches(SARCASTIC_PRAISE_PATTERNS, text)
    negative_experience_matches = regex_matches(NEGATIVE_EXPERIENCE_PATTERNS, text)
    hard_harm_matches = regex_matches(HARD_HARM_PATTERNS, text)
    negative_final_matches = regex_matches(NEGATIVE_FINAL_PATTERNS, last_text)
    negative_final_no_space_matches = regex_matches_no_space(
        NEGATIVE_FINAL_NOSPACE_PATTERNS,
        last_text,
    )
    positive_exception_matches = regex_matches(POSITIVE_EXCEPTION_PATTERNS, last_text)
    positive_exception_no_space_matches = regex_matches_no_space(
        POSITIVE_EXCEPTION_NOSPACE_PATTERNS,
        last_text,
    )
    purchase_rejection_matches = regex_matches(PURCHASE_REJECTION_PATTERNS, last_text)

    has_positive_exception_basic = bool(
        positive_exception_matches or positive_exception_no_space_matches
    )
    has_immersion_positive = bool(immersion_matches)
    has_negative_experience = bool(negative_experience_matches)
    has_hard_harm = bool(hard_harm_matches)
    has_purchase_rejection = bool(purchase_rejection_matches)
    immersion_positive_exception = (
        has_immersion_positive
        and not has_negative_experience
        and not has_hard_harm
        and not has_purchase_rejection
    )
    has_positive_exception = has_positive_exception_basic or immersion_positive_exception
    strong_negative_final = bool(
        (negative_final_matches or negative_final_no_space_matches)
        and not has_positive_exception
    )
    negative_anywhere = bool(
        (has_negative_experience or has_hard_harm or strong_negative_final)
        and not has_positive_exception
    )
    praise_negative_sarcasm = bool(
        praise_matches and has_negative_experience and not has_positive_exception
    )
    immersion_negative_sarcasm = bool(
        has_immersion_positive
        and has_hard_harm
        and strong_negative_final
        and not has_positive_exception
    )

    return {
        "strong_negative_final": strong_negative_final,
        "negative_anywhere": negative_anywhere,
        "praise_negative_sarcasm": praise_negative_sarcasm,
        "immersion_negative_sarcasm": immersion_negative_sarcasm,
        "has_positive_exception": has_positive_exception,
    }


def get_ending_model_signal(unit_results: list[dict], ending_unit_count=ENDING_UNIT_COUNT) -> dict:
    if not unit_results:
        return {
            "ending_negative_signal": False,
            "ending_positive_prob": 0.0,
            "ending_negative_prob": 0.0,
            "ending_negative_margin": 0.0,
        }

    ending_units = unit_results[-ending_unit_count:]
    weights = np.array(
        [max(unit["weight_token_count"], 1) for unit in ending_units],
        dtype=float,
    )
    ending_positive_prob = float(
        np.average([unit["positive_prob"] for unit in ending_units], weights=weights)
    )
    ending_negative_prob = float(
        np.average([unit["negative_prob"] for unit in ending_units], weights=weights)
    )
    ending_negative_margin = ending_negative_prob - ending_positive_prob

    return {
        "ending_negative_signal": (
            ending_negative_prob >= 0.70 and ending_negative_margin >= 0.30
        ),
        "ending_positive_prob": ending_positive_prob,
        "ending_negative_prob": ending_negative_prob,
        "ending_negative_margin": ending_negative_margin,
    }


def aggregate_text_sentiment(unit_results: list[dict]) -> dict:
    if not unit_results:
        return {
            "sentiment_label": "unknown",
            "positive_prob": 0.0,
            "negative_prob": 0.0,
            "confidence": 0.0,
            "positive_strength": 0.0,
            "negative_strength": 0.0,
            "ambiguous": True,
        }

    base_weights = np.array(
        [max(unit["weight_token_count"], 1) for unit in unit_results],
        dtype=float,
    )
    position_weights = np.ones(len(unit_results), dtype=float)
    ending_start_idx = max(len(unit_results) - ENDING_UNIT_COUNT, 0)
    position_weights[ending_start_idx:] = ENDING_BOOST
    weights = base_weights * position_weights

    positive_prob = float(
        np.average([unit["positive_prob"] for unit in unit_results], weights=weights)
    )
    negative_prob = float(
        np.average([unit["negative_prob"] for unit in unit_results], weights=weights)
    )
    score_diff = positive_prob - negative_prob
    is_positive = score_diff >= 0

    return {
        "sentiment_label": "positive" if is_positive else "negative",
        "positive_prob": positive_prob,
        "negative_prob": negative_prob,
        "confidence": positive_prob if is_positive else negative_prob,
        "positive_strength": max(score_diff, 0.0),
        "negative_strength": max(-score_diff, 0.0),
        "ambiguous": abs(score_diff) < AMBIGUOUS_MARGIN,
    }


def force_negative_text_result(result: dict, target_negative_prob: float, correction_type: str) -> dict:
    corrected = dict(result)
    adjusted_negative_prob = min(max(float(result["negative_prob"]), target_negative_prob), 0.99)
    adjusted_positive_prob = 1.0 - adjusted_negative_prob

    corrected.update(
        {
            "sentiment_label": "negative",
            "positive_prob": adjusted_positive_prob,
            "negative_prob": adjusted_negative_prob,
            "confidence": adjusted_negative_prob,
            "positive_strength": 0.0,
            "negative_strength": max(adjusted_negative_prob - adjusted_positive_prob, 0.0),
            "ambiguous": False,
            "correction_applied": True,
            "correction_type": correction_type,
        }
    )

    return corrected


def apply_text_context_correction(result: dict, review_text, unit_results: list[dict]) -> dict:
    detection = detect_context_negative(review_text)
    ending_signal = get_ending_model_signal(unit_results)
    corrected = dict(result)
    corrected.update(
        {
            "raw_sentiment_label": result["sentiment_label"],
            "raw_positive_prob": result["positive_prob"],
            "raw_negative_prob": result["negative_prob"],
            "raw_ambiguous": result["ambiguous"],
            "correction_applied": False,
            "correction_type": None,
        }
    )

    if detection["has_positive_exception"]:
        return corrected

    if detection["strong_negative_final"]:
        return force_negative_text_result(corrected, 0.90, "explicit_final_negative_override")

    if detection["praise_negative_sarcasm"]:
        return force_negative_text_result(corrected, 0.90, "praise_negative_sarcasm_override")

    if detection["immersion_negative_sarcasm"]:
        return force_negative_text_result(corrected, 0.88, "immersion_negative_sarcasm_override")

    if ending_signal["ending_negative_signal"] and detection["negative_anywhere"]:
        return force_negative_text_result(corrected, 0.82, "ending_negative_signal_override")

    if result["ambiguous"] and detection["negative_anywhere"]:
        return force_negative_text_result(corrected, 0.72, "ambiguous_negative_cue_override")

    return corrected


def analyze_text_sentiment(review_text) -> dict:
    review_text = clean_text(review_text)
    tokenizer = load_sentiment_model()["tokenizer"]
    units = make_analysis_units(review_text, tokenizer)
    unit_results = predict_units_sentiment(units)
    raw_text_result = aggregate_text_sentiment(unit_results)
    corrected = apply_text_context_correction(raw_text_result, review_text, unit_results)

    return {
        "text_sentiment_label": corrected["sentiment_label"],
        "text_positive_prob": corrected["positive_prob"],
        "text_negative_prob": corrected["negative_prob"],
        "text_confidence": corrected["confidence"],
        "text_positive_strength": corrected["positive_strength"],
        "text_negative_strength": corrected["negative_strength"],
        "text_ambiguous": corrected["ambiguous"],
        "text_correction_applied": corrected["correction_applied"],
        "text_correction_type": corrected["correction_type"],
        "raw_text_sentiment_label": corrected["raw_sentiment_label"],
        "raw_text_positive_prob": corrected["raw_positive_prob"],
        "raw_text_negative_prob": corrected["raw_negative_prob"],
        "raw_text_ambiguous": corrected["raw_ambiguous"],
    }


def rating_to_polarity(rating) -> float | None:
    if rating is None:
        return None

    rating = float(rating)
    if rating < 1 or rating > 5:
        raise ValueError("rating must be between 1 and 5.")

    return (rating - 3) / 2


def polarity_to_positive_score(polarity: float) -> float:
    return (polarity + 1) / 2


def decide_rating_text_weights(text_result: dict, rating) -> tuple[float, float, str]:
    if rating is None:
        return 0.0, 1.0, "text_only_no_rating"

    rating = float(rating)

    if text_result.get("text_correction_applied") is True:
        return 0.50, 0.50, "balanced_text_corrected"

    if text_result.get("text_ambiguous") is True:
        return 0.75, 0.25, "rating_priority_text_ambiguous"

    if rating == 3:
        return 0.35, 0.65, "text_priority_rating_neutral"

    return 0.60, 0.40, "rating_main_text_sub"


def combine_text_sentiment_with_rating(text_result: dict, rating=None) -> dict:
    text_positive_prob = float(text_result["text_positive_prob"])
    text_negative_prob = float(text_result["text_negative_prob"])
    text_polarity = text_positive_prob - text_negative_prob
    rating_polarity = rating_to_polarity(rating)
    rating_weight, text_weight, weight_reason = decide_rating_text_weights(text_result, rating)

    if rating_polarity is None:
        final_polarity = text_polarity
    else:
        final_polarity = rating_weight * rating_polarity + text_weight * text_polarity

    final_positive_score = polarity_to_positive_score(final_polarity)
    final_negative_score = 1.0 - final_positive_score

    if final_polarity >= FINAL_POSITIVE_THRESHOLD:
        final_sentiment_label = "positive"
    elif final_polarity <= FINAL_NEGATIVE_THRESHOLD:
        final_sentiment_label = "negative"
    else:
        final_sentiment_label = "neutral_or_mixed"

    conflict = False
    if rating_polarity is not None:
        conflict = (
            abs(rating_polarity) >= 0.50
            and abs(text_polarity) >= 0.50
            and rating_polarity * text_polarity < 0
        )

    return {
        "final_sentiment_label": final_sentiment_label,
        "final_positive_score": final_positive_score,
        "final_negative_score": final_negative_score,
        "final_polarity": final_polarity,
        "final_positive_strength": max(final_polarity, 0.0),
        "final_negative_strength": max(-final_polarity, 0.0),
        "rating": rating,
        "rating_polarity": rating_polarity,
        "rating_weight": rating_weight,
        "text_polarity": text_polarity,
        "text_weight": text_weight,
        "weight_reason": weight_reason,
        "conflict": conflict,
        "review_weight_for_aggregation": 0.5 if conflict else 1.0,
    }


def analyze_review_sentiment(review_text, rating=None) -> dict:
    review_text = clean_text(review_text)
    text_result = analyze_text_sentiment(review_text)
    combined = combine_text_sentiment_with_rating(text_result, rating)

    return {
        "review_text": review_text,
        **combined,
        **text_result,
        "model_version": SENTIMENT_MODEL_VERSION,
    }


def fallback_review_sentiment_from_rating(rating=None) -> dict:
    polarity = rating_to_polarity(rating) if rating is not None else 0.0
    positive_score = polarity_to_positive_score(polarity)

    if polarity >= FINAL_POSITIVE_THRESHOLD:
        label = "positive"
    elif polarity <= FINAL_NEGATIVE_THRESHOLD:
        label = "negative"
    else:
        label = "neutral_or_mixed"

    return {
        "final_sentiment_label": label,
        "final_positive_score": positive_score,
        "final_negative_score": 1.0 - positive_score,
        "final_polarity": polarity,
        "review_weight_for_aggregation": 1.0,
        "model_version": "rating-fallback-v1",
    }

