import requests
from html import unescape
from urllib.parse import unquote

from django.conf import settings
from django.db import transaction

from books.models import Author, Book, BookAuthor

from .utils import map_kakao_book_document, map_kdc_to_category


class KakaoBookAPIError(Exception):
    pass


class Data4LibraryAPIError(Exception):
    pass


class KakaoBookService:
    BASE_URL = "https://dapi.kakao.com/v3/search/book"

    @classmethod
    def _headers(cls):
        if not settings.KAKAO_REST_API_KEY:
            raise KakaoBookAPIError("KAKAO_REST_API_KEY is not configured.")
        return {
            "Authorization": f"KakaoAK {settings.KAKAO_REST_API_KEY}"
        }

    @classmethod
    def search_books(cls, query, page=1, size=20, sort="accuracy", target=None):
        params = {
            "query": query,
            "page": page,
            "size": size,
            "sort": sort,
        }
        if target:
            params["target"] = target

        try:
            response = requests.get(
                cls.BASE_URL,
                headers=cls._headers(),
                params=params,
                timeout=5,
            )
        except requests.RequestException as e:
            raise KakaoBookAPIError(f"Kakao API connection failed: {str(e)}")

        if response.status_code != 200:
            raise KakaoBookAPIError(
                f"Kakao API request failed: {response.status_code} {response.text}"
            )

        return response.json()


def _clean_text(value):
    if not value:
        return ""
    return " ".join(unescape(str(value)).split())


class Data4LibraryBookService:
    BASE_URL = "https://data4library.kr/api/srchDtlList"

    @classmethod
    def _auth_key(cls):
        auth_key = getattr(settings, "DATA4LIBRARY_AUTH_KEY", None)
        return unquote(auth_key).strip() if auth_key else None

    @classmethod
    def search_by_isbn(cls, isbn):
        if not cls._auth_key():
            return None

        try:
            response = requests.get(
                cls.BASE_URL,
                params={
                    "authKey": cls._auth_key(),
                    "isbn13": isbn,
                    "loaninfoYN": "N",
                    "format": "json",
                },
                timeout=5,
            )
        except requests.RequestException as e:
            raise Data4LibraryAPIError("Data4Library API connection failed.") from e

        if response.status_code != 200:
            raise Data4LibraryAPIError(
                f"Data4Library API request failed: {response.status_code} {response.text}"
            )

        try:
            data = response.json()
        except ValueError as e:
            raise Data4LibraryAPIError("Data4Library API returned invalid JSON.") from e

        document = cls._select_document(data, isbn)
        if not document:
            return None

        return cls._map_document(document)

    @classmethod
    def _select_document(cls, data, isbn):
        response = data.get("response", data) if isinstance(data, dict) else {}
        detail = response.get("detail", []) if isinstance(response, dict) else []
        if isinstance(detail, dict):
            detail = [detail]

        normalized = []
        for item in detail:
            if isinstance(item, dict) and isinstance(item.get("book"), dict):
                normalized.append(item["book"])
            elif isinstance(item, dict):
                normalized.append(item)

        for doc in normalized:
            if str(doc.get("isbn13", "")).strip() == isbn:
                return doc

        return normalized[0] if normalized else None

    @classmethod
    def _map_document(cls, doc):
        kdc = _clean_text(doc.get("class_no") or doc.get("classNo"))
        subject = _clean_text(doc.get("class_nm") or doc.get("classNm"))
        description = _clean_text(doc.get("description"))
        category = (
            map_kdc_to_category(kdc)
            or map_kdc_to_category(subject)
            or subject
        )

        return {
            "description": description,
            "kdc": kdc,
            "subject": subject,
            "category": category,
        }


class BookImportService:

    @classmethod
    @transaction.atomic
    def import_from_kakao(cls, isbn13):
        # 1. 이미 존재하면 부족한 도서관 정보나루 정보만 보강
        existing = Book.objects.filter(isbn13=isbn13).first()
        if existing:
            cls._merge_data4library_metadata(existing, isbn13)
            return existing, False

        # 2. 카카오 API 조회
        data = KakaoBookService.search_books(
            query=isbn13,
            target="isbn",
            page=1,
            size=10,
        )

        documents = data.get("documents", [])
        if not documents:
            raise KakaoBookAPIError("책을 찾을 수 없습니다.")

        # 3. 정확한 isbn13 일치 항목만 허용
        selected = None
        for doc in documents:
            if isbn13 in doc.get("isbn", "").split():
                selected = doc
                break

        if selected is None:
            raise KakaoBookAPIError("정확히 일치하는 isbn13 도서를 찾을 수 없습니다.")

        mapped = map_kakao_book_document(selected)
        data4library_metadata = cls._get_data4library_metadata(isbn13)

        # 4. Book 생성
        book = Book.objects.create(
            isbn13=mapped.get("isbn13") or None,
            title=mapped.get("title", ""),
            publisher=mapped.get("publisher", ""),
            description=data4library_metadata.get("description") or mapped.get("contents", ""),
            category=data4library_metadata.get("category", ""),
            kdc=data4library_metadata.get("kdc", ""),
            subject=data4library_metadata.get("subject", ""),
            thumbnail_url=mapped.get("thumbnail", ""),
            external_api_source="kakao",
            external_api_id=mapped.get("external_api_id", ""),
        )

        # 5. Author + BookAuthor 생성
        authors = mapped.get("authors", [])
        for name in authors:
            author, _ = Author.objects.get_or_create(name=name)
            BookAuthor.objects.get_or_create(
                book=book,
                author=author,
                role=BookAuthor.ROLE_AUTHOR,
            )

        translators = mapped.get("translators", [])
        for name in translators:
            translator, _ = Author.objects.get_or_create(name=name)
            BookAuthor.objects.get_or_create(
                book=book,
                author=translator,
                role=BookAuthor.ROLE_TRANSLATOR,
            )

        return book, True

    @classmethod
    def _get_data4library_metadata(cls, isbn13):
        try:
            return Data4LibraryBookService.search_by_isbn(isbn13) or {}
        except Data4LibraryAPIError:
            return {}

    @classmethod
    def _merge_data4library_metadata(cls, book, isbn13):
        metadata = cls._get_data4library_metadata(isbn13)
        if not metadata:
            return

        changed_fields = []
        field_map = {
            "description": metadata.get("description"),
            "category": metadata.get("category"),
            "kdc": metadata.get("kdc"),
            "subject": metadata.get("subject"),
        }

        for field, value in field_map.items():
            if value not in (None, "") and not getattr(book, field):
                setattr(book, field, value)
                changed_fields.append(field)

        if changed_fields:
            book.save(update_fields=changed_fields + ["updated_at"])
