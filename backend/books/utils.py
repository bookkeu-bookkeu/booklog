# books/utils.py
def split_kakao_isbn(isbn_value: str):
    if not isbn_value:
        return "", ""

    parts = isbn_value.split()
    isbn10 = ""
    isbn13 = ""

    for part in parts:
        if len(part) == 10 and not isbn10:
            isbn10 = part
        elif len(part) == 13 and not isbn13:
            isbn13 = part

    return isbn10, isbn13


KDC_CATEGORY_MAP = {
    "0": "총류",
    "1": "철학",
    "2": "종교",
    "3": "사회과학",
    "4": "자연과학",
    "5": "기술과학",
    "6": "예술",
    "7": "언어",
    "8": "문학",
    "9": "역사",
}


def map_kdc_to_category(kdc_value: str):
    if not kdc_value:
        return ""

    first_digit = next((char for char in str(kdc_value).strip() if char.isdigit()), "")
    return KDC_CATEGORY_MAP.get(first_digit, "")


def map_kakao_book_document(doc):
    isbn10, isbn13 = split_kakao_isbn(doc.get("isbn", ""))

    url = doc.get("url", "")
    external_api_id = ""
    if "bookId=" in url:
        external_api_id = url.split("bookId=")[-1].split("&")[0]

    return {
        "source": "kakao",
        "external_api_id": external_api_id,
        "title": doc.get("title", ""),
        "contents": doc.get("contents", ""),
        "url": url,
        "isbn": doc.get("isbn", ""),
        "isbn10": isbn10,
        "isbn13": isbn13,
        "authors": doc.get("authors", []),
        "translators": doc.get("translators", []),
        "publisher": doc.get("publisher", ""),
        "published_at": doc.get("datetime", ""),
        "thumbnail": doc.get("thumbnail", ""),
        "price": doc.get("price", 0),
        "sale_price": doc.get("sale_price", 0),
        "status": doc.get("status", ""),
    }


def merge_external_book_metadata(mapped, national_metadata):
    if not national_metadata:
        return mapped

    merged = {**mapped}
    description = national_metadata.get("description", "")
    kdc = national_metadata.get("kdc", "")
    subject = national_metadata.get("subject", "")
    category = national_metadata.get("category", "")

    if description:
        merged["contents"] = description
        merged["description"] = description
    if kdc:
        merged["kdc"] = kdc
    if subject:
        merged["subject"] = subject
    if category:
        merged["category"] = category

    return merged
