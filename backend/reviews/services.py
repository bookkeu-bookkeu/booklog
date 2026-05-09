from django.shortcuts import get_object_or_404

from books.models import Book
from analytics.services import analyze_review_and_update_user_rbti
from reading.models import UserBook
from .models import QuoteNote, Review, ReviewLike


class ReviewService:
    @staticmethod
    def create_review(*, user, book_id, user_book_id=None, rating, content, visibility):
        book = get_object_or_404(Book, id=book_id)

        user_book = None
        if user_book_id:
            user_book = get_object_or_404(UserBook, id=user_book_id, user=user, book=book)

        review = Review.objects.create(
            user=user,
            book=book,
            user_book=user_book,
            rating=rating,
            content=content,
            visibility=visibility,
        )
        analyze_review_and_update_user_rbti(review)
        return review

    @staticmethod
    def update_review(*, review, rating=None, content=None, visibility=None):
        if rating is not None:
            review.rating = rating
        if content is not None:
            review.content = content
        if visibility is not None:
            review.visibility = visibility
        review.save()
        return review


class QuoteNoteService:
    @staticmethod
    def create_quote_note(
        *,
        user,
        book_id,
        user_book_id=None,
        quoted_text,
        note="",
        page_number=None,
    ):
        book = get_object_or_404(Book, id=book_id)

        user_book = None
        if user_book_id:
            user_book = get_object_or_404(UserBook, id=user_book_id, user=user, book=book)

        return QuoteNote.objects.create(
            user=user,
            book=book,
            user_book=user_book,
            quoted_text=quoted_text,
            note=note,
            page_number=page_number,
            visibility=QuoteNote.VISIBILITY_PRIVATE,
        )

    @staticmethod
    def update_quote_note(
        *,
        quote_note,
        quoted_text=None,
        note=None,
        page_number=None,
    ):
        if quoted_text is not None:
            quote_note.quoted_text = quoted_text
        if note is not None:
            quote_note.note = note
        if page_number is not None:
            quote_note.page_number = page_number

        quote_note.visibility = QuoteNote.VISIBILITY_PRIVATE
        quote_note.save()
        return quote_note


class ReviewLikeService:
    @staticmethod
    def like_review(*, user, review):
        if review.user_id == user.id:
            raise ValueError("본인 리뷰에는 좋아요를 누를 수 없습니다.")

        like, created = ReviewLike.objects.get_or_create(user=user, review=review)
        if created:
            review.like_count += 1
            review.save(update_fields=["like_count"])
        return created

    @staticmethod
    def unlike_review(*, user, review):
        deleted_count, _ = ReviewLike.objects.filter(user=user, review=review).delete()
        if deleted_count:
            review.like_count = max(review.like_count - 1, 0)
            review.save(update_fields=["like_count"])
        return deleted_count > 0
