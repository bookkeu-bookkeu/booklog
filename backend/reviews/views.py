from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.permissions import IsOwner, IsReviewVisibleOrOwner, CanLikeReview
from .models import QuoteNote, Review
from .serializers import (
    QuoteNoteCreateUpdateSerializer,
    QuoteNoteDetailSerializer,
    QuoteNoteListSerializer,
    ReviewCreateUpdateSerializer,
    ReviewDetailSerializer,
    ReviewListSerializer,
)
from .services import QuoteNoteService, ReviewLikeService, ReviewService


class ReviewListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Review.objects.select_related("user", "book", "user_book")

        book_id = request.query_params.get("book_id")
        mine = request.query_params.get("mine")
        visibility = request.query_params.get("visibility")

        if book_id:
            queryset = queryset.filter(book_id=book_id)

        if mine == "true":
            queryset = queryset.filter(user=request.user)
        else:
            queryset = queryset.filter(visibility="public")

        if visibility in ["public", "private"] and mine == "true":
            queryset = queryset.filter(visibility=visibility)

        queryset = queryset.order_by("-created_at")

        serializer = ReviewListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ReviewCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            review = ReviewService.create_review(
                user=request.user,
                book_id=serializer.validated_data["book_id"],
                user_book_id=serializer.validated_data.get("user_book_id"),
                title=serializer.validated_data["title"],
                content=serializer.validated_data["content"],
                visibility=serializer.validated_data["visibility"],
            )
        except IntegrityError:
            return Response(
                {"detail": "한 책에는 리뷰를 1개만 작성할 수 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = ReviewDetailSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ReviewDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), IsReviewVisibleOrOwner()]
        return [IsAuthenticated(), IsOwner()]


    def get_object(self, request, pk):
        review = get_object_or_404(
            Review.objects.select_related("user", "book", "user_book"),
            id=pk,
        )
        self.check_object_permissions(request, review)
        return review

    def get(self, request, pk):
        review = self.get_object(request, pk)
        serializer = ReviewDetailSerializer(review)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        review = self.get_object(request, pk)

        serializer = ReviewCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated = ReviewService.update_review(
            review=review,
            title=serializer.validated_data.get("title"),
            content=serializer.validated_data.get("content"),
            visibility=serializer.validated_data.get("visibility"),
        )

        response_serializer = ReviewDetailSerializer(updated)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        review = self.get_object(request, pk)
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class QuoteNoteListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = QuoteNote.objects.select_related("book", "user_book").filter(
            user=request.user
        )

        book_id = request.query_params.get("book_id")
        if book_id:
            queryset = queryset.filter(book_id=book_id)

        queryset = queryset.order_by("-created_at")

        serializer = QuoteNoteListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = QuoteNoteCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quote_note = QuoteNoteService.create_quote_note(
            user=request.user,
            book_id=serializer.validated_data["book_id"],
            user_book_id=serializer.validated_data.get("user_book_id"),
            quoted_text=serializer.validated_data["quoted_text"],
            note=serializer.validated_data.get("note", ""),
            page_number=serializer.validated_data.get("page_number"),
        )

        response_serializer = QuoteNoteDetailSerializer(quote_note)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class QuoteNoteDetailAPIView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def get_object(self, request, pk):
        quote_note = get_object_or_404(
            QuoteNote.objects.select_related("book", "user_book"),
            id=pk,
        )
        self.check_object_permissions(request, quote_note)
        return quote_note

    def get(self, request, pk):
        quote_note = self.get_object(request, pk)
        serializer = QuoteNoteDetailSerializer(quote_note)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        quote_note = self.get_object(request, pk)

        serializer = QuoteNoteCreateUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated = QuoteNoteService.update_quote_note(
            quote_note=quote_note,
            quoted_text=serializer.validated_data.get("quoted_text"),
            note=serializer.validated_data.get("note"),
            page_number=serializer.validated_data.get("page_number"),
        )

        response_serializer = QuoteNoteDetailSerializer(updated)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        quote_note = self.get_object(request, pk)
        quote_note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewLikeAPIView(APIView):
    permission_classes = [IsAuthenticated, CanLikeReview]

    def get_object(self, request, pk):
        review = get_object_or_404(Review, id=pk)
        self.check_object_permissions(request, review)
        return review

    def post(self, request, pk):
        review = self.get_object(request, pk)

        created = ReviewLikeService.like_review(user=request.user, review=review)

        review.refresh_from_db(fields=["like_count"])

        if not created:
            return Response(
                {
                    "liked": True,
                    "created": False,
                    "like_count": review.like_count,
                    "detail": "이미 좋아요를 누른 리뷰입니다.",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "liked": True,
                "created": True,
                "like_count": review.like_count,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        review = get_object_or_404(Review, id=pk)

        deleted = ReviewLikeService.unlike_review(user=request.user, review=review)
        review.refresh_from_db(fields=["like_count"])

        return Response(
            {
                "liked": False,
                "deleted": deleted,
                "like_count": review.like_count,
            },
            status=status.HTTP_200_OK,
        )