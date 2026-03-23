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