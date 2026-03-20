from __future__ import annotations

import html
import re
import time
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from bs4 import BeautifulSoup, Tag


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)


def clean_text(text: str) -> str:
    """HTML 엔티티와 공백 정리"""
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_review_body(review_block: Tag) -> str:
    """
    리뷰 1개 블록(reviewInfoGrp)에서 원문 본문만 추출
    """
    origin = review_block.select_one("div.reviewInfoBot.origin div.review_cont")
    if origin is None:
        return ""

    paragraphs: list[str] = []

    for p in origin.find_all("p"):
        text = clean_text(p.get_text(" ", strip=True))
        if not text:
            continue
        if text.startswith("원문주소 :"):
            continue
        paragraphs.append(text)

    if not paragraphs:
        return clean_text(origin.get_text(" ", strip=True))

    return "\n\n".join(paragraphs)


def extract_single_review(review_block: Tag, goods_no: str) -> dict[str, Any]:
    """리뷰 블록 1개에서 필요한 필드만 추출"""
    title_tag = review_block.select_one("div.reviewInfoTop span.review_tit span.txt")
    rating_tag = review_block.select_one("div.reviewInfoTop span.review_rating span.total_rating")
    origin_link_tag = review_block.select_one("div.review_lnk a")

    rating_text = clean_text(rating_tag.get_text()) if rating_tag else ""
    rating_score = None
    match = re.search(r"(\d+)", rating_text)
    if match:
        rating_score = int(match.group(1))

    return {
        "goods_no": goods_no,
        "review_title": clean_text(title_tag.get_text()) if title_tag else "",
        "rating_score": rating_score,
        "origin_url": origin_link_tag["href"] if origin_link_tag and origin_link_tag.has_attr("href") else "",
        "review_text": extract_review_body(review_block),
    }


def parse_yes24_review_html(html_text: str, goods_no: str) -> list[dict[str, Any]]:
    """리뷰 목록 HTML에서 리뷰 여러 개 추출"""
    soup = BeautifulSoup(html_text, "html.parser")
    review_blocks = soup.select("div.reviewInfoGrp")

    reviews: list[dict[str, Any]] = []
    for block in review_blocks:
        review = extract_single_review(block, goods_no)
        if not review["review_text"]:
            continue
        reviews.append(review)

    return reviews


def build_review_page_url(goods_no: str, page_number: int, sort: int = 2) -> str:
    """
    YES24 리뷰 목록 URL 생성
    sort: 1=최근순, 2=추천순, 3=별점순
    """
    return (
        f"https://www.yes24.com/Product/CommunityModules/GoodsReviewList/{goods_no}"
        f"?goodsSortNo=001022&resourceKeyGb=01&goodsStateGb=02"
        f"&goodsSetYn=N,N&goodsGb=01&Sort={sort}&PageNumber={page_number}"
        f"&Type=ALL&DojungAfterBuy=0"
    )


def fetch_yes24_review_page(url: str) -> str:
    """YES24 리뷰 목록 페이지 HTML 요청"""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/123.0.0.0 Safari/537.36"
        ),
        "Referer": "https://www.yes24.com/",
    }

    response = requests.get(url, headers=headers, timeout=20)
    response.raise_for_status()
    return response.text


def crawl_yes24_reviews(
    goods_no: str,
    start_page: int = 1,
    end_page: int = 10,
    sort: int = 2,
    sleep_seconds: float = 1.0,
    max_reviews: int | None = 50,
) -> list[dict[str, Any]]:
    """
    여러 페이지를 순회하며 리뷰 수집
    max_reviews를 설정하면 책당 최대 리뷰 수를 제한할 수 있다.
    """
    all_reviews: list[dict[str, Any]] = []
    seen_urls: set[str] = set()

    for page_number in range(start_page, end_page + 1):
        if max_reviews is not None and len(all_reviews) >= max_reviews:
            break

        url = build_review_page_url(goods_no, page_number, sort=sort)
        print(f"[요청] page={page_number} url={url}")

        try:
            html_text = fetch_yes24_review_page(url)
            page_reviews = parse_yes24_review_html(html_text, goods_no)
        except requests.RequestException as e:
            print(f"[오류] page={page_number} 요청 실패: {e}")
            continue
        except Exception as e:
            print(f"[오류] page={page_number} 파싱 실패: {e}")
            continue

        unique_page_reviews: list[dict[str, Any]] = []
        for review in page_reviews:
            origin_url = review.get("origin_url", "")
            if origin_url and origin_url in seen_urls:
                continue
            if origin_url:
                seen_urls.add(origin_url)
            unique_page_reviews.append(review)

        if max_reviews is not None:
            remain = max_reviews - len(all_reviews)
            unique_page_reviews = unique_page_reviews[:remain]

        print(f"[완료] page={page_number} 추출={len(page_reviews)} 중복제거후={len(unique_page_reviews)}")
        all_reviews.extend(unique_page_reviews)

        time.sleep(sleep_seconds)

    return all_reviews


def save_reviews_to_csv(reviews: list[dict[str, Any]], output_path: Path) -> None:
    """리뷰 리스트를 바로 CSV로 저장"""
    df = pd.DataFrame(reviews)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"\n저장 완료: {output_path}")
    print(f"총 저장 리뷰 수: {len(df)}")
    print(f"컬럼: {df.columns.tolist()}")


def main() -> None:
    # 여기만 바꿔서 쓰면 된다
    goods_no = "150166715"   # YES24 상품번호
    start_page = 1
    end_page = 10           # 최대 몇 페이지까지 볼지
    sort = 2                # 1=최근순, 2=추천순, 3=별점순
    max_reviews = 50        # 책당 최대 리뷰 수

    reviews = crawl_yes24_reviews(
        goods_no=goods_no,
        start_page=start_page,
        end_page=end_page,
        sort=sort,
        sleep_seconds=1.0,
        max_reviews=max_reviews,
    )

    for i, review in enumerate(reviews[:3], start=1):
        print(f"\n[{i}]")
        print(f"제목: {review['review_title']}")
        print(f"평점: {review['rating_score']}")
        print(f"원문주소: {review['origin_url']}")
        print(f"본문 미리보기: {review['review_text'][:200]}...")

    output_path = DATA_RAW_DIR / f"yes24_reviews_{goods_no}_재테크.csv"
    save_reviews_to_csv(reviews, output_path)


if __name__ == "__main__":
    main()