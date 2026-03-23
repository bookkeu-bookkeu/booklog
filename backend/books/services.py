# books/services.py
import requests

from django.conf import settings
from django.db import transaction

from books.models import Author, Book, BookAuthor

from .utils import map_kakao_book_document


class KakaoBookAPIError(Exception):
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
    def search_books(cls, query, page=1, size=10, sort="accuracy", target=None):
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


class BookImportService:

    @classmethod
    @transaction.atomic
    def import_from_kakao(cls, isbn13):
        # 1. 이미 존재하면 바로 반환
        existing = Book.objects.filter(isbn13=isbn13).first()
        if existing:
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

        # 4. Book 생성
        book = Book.objects.create(
            isbn13=mapped.get("isbn13") or None,
            title=mapped.get("title", ""),
            publisher=mapped.get("publisher", ""),
            description=mapped.get("contents", ""),
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