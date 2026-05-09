from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from reading.models import UserBook

from .serializers import BookImportRequestSerializer, ExternalBookSearchResponseSerializer
from .services import (
    BookImportService,
    Data4LibraryAPIError,
    Data4LibraryBookService,
    KakaoBookAPIError,
    KakaoBookService,
)
from .utils import map_kakao_book_document, merge_external_book_metadata


class BookSearchAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("query", "").strip()
        sort = request.query_params.get("sort", "accuracy")
        target = request.query_params.get("target")
        page = request.query_params.get("page", "1")
        size = request.query_params.get("size", "20")

        if not query:
            return Response(
                {"detail": "query 파라미터는 필수입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if sort not in ["accuracy", "latest"]:
            return Response(
                {"detail": "sort는 accuracy 또는 latest만 가능합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if target and target not in ["title", "isbn", "publisher", "person"]:
            return Response(
                {"detail": "target은 title, isbn, publisher, person만 가능합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            page = int(page)
            size = int(size)
        except ValueError:
            return Response(
                {"detail": "page와 size는 숫자여야 합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if page < 1:
            return Response(
                {"detail": "page는 1 이상이어야 합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if size < 1 or size > 20:
            return Response(
                {"detail": "size는 1 이상 20 이하여야 합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = KakaoBookService.search_books(
                query=query,
                page=page,
                size=size,
                sort=sort,
                target=target,
            )
        except KakaoBookAPIError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        results = [
            map_kakao_book_document(doc)
            for doc in data.get("documents", [])
        ]

        user_books = UserBook.objects.filter(user=request.user).values(
            "book__isbn13",
            "book__external_api_id",
        )

        user_isbn13_set = {
            row["book__isbn13"].strip()
            for row in user_books
            if isinstance(row.get("book__isbn13"), str) and row["book__isbn13"].strip()
        }
        user_external_id_set = {
            row["book__external_api_id"].strip()
            for row in user_books
            if isinstance(row.get("book__external_api_id"), str)
            and row["book__external_api_id"].strip()
        }

        for item in results:
            isbn13 = item.get("isbn13", "")
            external_api_id = item.get("external_api_id", "")
            item["is_in_library"] = (
                (isinstance(isbn13, str) and isbn13.strip() in user_isbn13_set)
                or (
                    isinstance(external_api_id, str)
                    and external_api_id.strip() in user_external_id_set
                )
            )

        payload = {
            "total_count": data.get("meta", {}).get("total_count", 0),
            "pageable_count": data.get("meta", {}).get("pageable_count", 0),
            "is_end": data.get("meta", {}).get("is_end", True),
            "page": page,
            "size": size,
            "results": results,
        }

        serializer = ExternalBookSearchResponseSerializer(payload)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExternalBookDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        isbn = request.query_params.get("isbn", "").strip()

        if not isbn:
            return Response(
                {"detail": "isbn 파라미터는 필수입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = KakaoBookService.search_books(
                query=isbn,
                page=1,
                size=10,
                sort="accuracy",
                target="isbn",
            )
        except KakaoBookAPIError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        documents = data.get("documents", [])
        if not documents:
            return Response(
                {"detail": "해당 책을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        selected = None
        for doc in documents:
            raw_isbn = doc.get("isbn", "")
            if isbn in raw_isbn.split():
                selected = doc
                break

        if selected is None:
            selected = documents[0]

        mapped = map_kakao_book_document(selected)
        try:
            data4library_metadata = Data4LibraryBookService.search_by_isbn(
                mapped.get("isbn13") or isbn
            )
        except Data4LibraryAPIError:
            data4library_metadata = None

        return Response(
            merge_external_book_metadata(mapped, data4library_metadata),
            status=status.HTTP_200_OK,
        )


class BookImportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BookImportRequestSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        isbn13 = serializer.validated_data["isbn13"]

        try:
            book, created = BookImportService.import_from_kakao(isbn13)
        except KakaoBookAPIError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "id": book.id,
                "isbn13": book.isbn13,
                "title": book.title,
                "publisher": book.publisher,
                "contents": book.description,
                "description": book.description,
                "category": book.category,
                "kdc": book.kdc,
                "subject": book.subject,
                "thumbnail_url": book.thumbnail_url,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
