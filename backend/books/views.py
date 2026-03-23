from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import BookImportRequestSerializer, ExternalBookSearchResponseSerializer
from .services import BookImportService, KakaoBookAPIError, KakaoBookService
from .utils import map_kakao_book_document


class BookSearchAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("query", "").strip()
        sort = request.query_params.get("sort", "accuracy")
        target = request.query_params.get("target")
        page = request.query_params.get("page", "1")
        size = request.query_params.get("size", "10")

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

        if size < 1 or size > 50:
            return Response(
                {"detail": "size는 1 이상 50 이하여야 합니다."},
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

        return Response(
            map_kakao_book_document(selected),
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
                "thumbnail_url": book.thumbnail_url,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )