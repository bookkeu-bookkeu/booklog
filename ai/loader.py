# ai/loader.py

"""
AI 모델 로더.

역할:
- ai/models/ 안에 저장된 RI, AE, NS 모델을 불러온다.
- 한 번 불러온 모델은 메모리에 캐싱해서 다시 불러오지 않는다.
- ri.py, ae.py, ns.py에서 공통으로 사용한다.
"""

from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from ai.constants import MODEL_DIR_NAMES


# =========================
# 디바이스 설정
# =========================
# 서버/로컬에 GPU가 있으면 cuda 사용, 아니면 CPU 사용.
# 일반 노트북이나 배포 서버에서는 대부분 cpu로 동작할 가능성이 높다.

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# =========================
# 경로 설정
# =========================
# 현재 파일 위치:
# booklog/ai/loader.py
#
# 따라서:
# AI_DIR = booklog/ai
# MODEL_BASE_DIR = booklog/ai/models

AI_DIR = Path(__file__).resolve().parent
MODEL_BASE_DIR = AI_DIR / "models"


# =========================
# 모델 캐시
# =========================
# 모델을 매번 새로 로드하면 너무 느리다.
# 그래서 한 번 로드한 모델은 _model_cache에 저장해둔다.

_model_cache = {}


def get_model_dir(axis_name: str) -> Path:
    """
    축 이름에 맞는 모델 폴더 경로를 반환한다.

    axis_name:
        "RI", "AE", "NS"

    return:
        booklog/ai/models/model_axis2_RI
        booklog/ai/models/model_axis2_AE
        booklog/ai/models/model_axis2_NS
    """
    axis_name = axis_name.upper()

    if axis_name not in MODEL_DIR_NAMES:
        raise ValueError(
            f"지원하지 않는 axis_name입니다: {axis_name}. "
            f"가능한 값: {list(MODEL_DIR_NAMES.keys())}"
        )

    model_dir_name = MODEL_DIR_NAMES[axis_name]
    model_dir = MODEL_BASE_DIR / model_dir_name

    return model_dir


def validate_model_dir(model_dir: Path) -> None:
    """
    모델 폴더와 필수 파일이 있는지 확인한다.
    """
    if not model_dir.exists():
        raise FileNotFoundError(f"모델 폴더를 찾을 수 없습니다: {model_dir}")

    config_file = model_dir / "config.json"
    tokenizer_config_file = model_dir / "tokenizer_config.json"
    tokenizer_json_file = model_dir / "tokenizer.json"
    safetensors_file = model_dir / "model.safetensors"
    pytorch_bin_file = model_dir / "pytorch_model.bin"

    if not config_file.exists():
        raise FileNotFoundError(f"config.json 파일이 없습니다: {config_file}")

    if not tokenizer_config_file.exists() and not tokenizer_json_file.exists():
        raise FileNotFoundError(
            "토크나이저 파일을 찾을 수 없습니다. "
            f"tokenizer_config.json 또는 tokenizer.json이 필요합니다: {model_dir}"
        )

    if not safetensors_file.exists() and not pytorch_bin_file.exists():
        raise FileNotFoundError(
            "모델 가중치 파일을 찾을 수 없습니다. "
            f"model.safetensors 또는 pytorch_model.bin이 필요합니다: {model_dir}"
        )


def load_axis_model(axis_name: str) -> dict:
    """
    RI, AE, NS 중 하나의 모델과 토크나이저를 로드한다.

    사용 예:
        loaded = load_axis_model("RI")
        tokenizer = loaded["tokenizer"]
        model = loaded["model"]

    return:
        {
            "axis_name": "RI",
            "model_dir": Path(...),
            "tokenizer": tokenizer,
            "model": model,
            "device": DEVICE,
        }
    """
    axis_name = axis_name.upper()

    # 이미 로드된 모델이면 캐시에서 바로 반환
    if axis_name in _model_cache:
        return _model_cache[axis_name]

    model_dir = get_model_dir(axis_name)
    validate_model_dir(model_dir)

    tokenizer = AutoTokenizer.from_pretrained(str(model_dir))
    model = AutoModelForSequenceClassification.from_pretrained(str(model_dir))

    model.to(DEVICE)
    model.eval()

    loaded = {
        "axis_name": axis_name,
        "model_dir": model_dir,
        "tokenizer": tokenizer,
        "model": model,
        "device": DEVICE,
    }

    _model_cache[axis_name] = loaded

    return loaded


def clear_model_cache() -> None:
    """
    모델 캐시를 비운다.

    보통은 사용할 일이 거의 없지만,
    개발 중 모델 파일을 바꾼 뒤 다시 로드하고 싶을 때 사용할 수 있다.
    """
    _model_cache.clear()


def get_loaded_axes() -> list[str]:
    """
    현재 메모리에 로드된 모델 축 목록을 반환한다.
    """
    return list(_model_cache.keys())