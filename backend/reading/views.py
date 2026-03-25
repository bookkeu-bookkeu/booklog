from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOwner
from .models import UserBook
from .serializers import (
    UserBookCreateUpdateSerializer,
    UserBookDetailSerializer,
    UserBookListSerializer,
)
from .services import UserBookService


class UserBookListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            UserBook.objects.filter(user=request.user)
            .select_related("book", "shelf")
            .prefetch_related("book__authors")
        )

        shelf_code = request.query_params.get("shelf")
        if shelf_code:
            queryset = queryset.filter(shelf__code=shelf_code)

        queryset = queryset.order_by("-updated_at")

        serializer = UserBookListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = UserBookCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_book, created = UserBookService.create_or_update_user_book(
            user=request.user,
            book_id=serializer.validated_data["book_id"],
            shelf_code=serializer.validated_data["shelf_code"],
            started_at=serializer.validated_data.get("started_at"),
            finished_at=serializer.validated_data.get("finished_at"),
            is_favorite=serializer.validated_data.get("is_favorite", False),
        )

        response_serializer = UserBookDetailSerializer(user_book)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class UserBookDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_object(self, request, pk):
        user_book = get_object_or_404(
            UserBook.objects.select_related("book", "shelf"),
            id=pk,
        )
        self.check_object_permissions(request, user_book)
        return user_book

    def get(self, request, pk):
        user_book = self.get_object(request, pk)
        serializer = UserBookDetailSerializer(user_book)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        user_book = self.get_object(request, pk)

        serializer = UserBookCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated = UserBookService.update_user_book(
            user_book=user_book,
            shelf_code=serializer.validated_data.get("shelf_code"),
            started_at=serializer.validated_data.get("started_at"),
            finished_at=serializer.validated_data.get("finished_at"),
            is_favorite=serializer.validated_data.get("is_favorite"),
        )

        response_serializer = UserBookDetailSerializer(updated)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        user_book = self.get_object(request, pk)
        user_book.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)