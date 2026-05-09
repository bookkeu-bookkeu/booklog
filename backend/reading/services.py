from django.shortcuts import get_object_or_404

from books.models import Book
from .models import Shelf, UserBook


class UserBookService:
    @staticmethod
    def create_or_update_user_book(
        *,
        user,
        book_id,
        shelf_code,
        started_at=None,
        finished_at=None,
        book_type=None,
        is_favorite=False,
    ):
        book = get_object_or_404(Book, id=book_id)
        shelf = get_object_or_404(Shelf, code=shelf_code)

        user_book, created = UserBook.objects.get_or_create(
            user=user,
            book=book,
            defaults={
                "shelf": shelf,
                "started_at": started_at,
                "finished_at": finished_at,
                "book_type": book_type,
                "is_favorite": is_favorite,
            },
        )

        if not created:
            user_book.shelf = shelf
            if started_at is not None:
                user_book.started_at = started_at
            if finished_at is not None:
                user_book.finished_at = finished_at
            if book_type is not None:
                user_book.book_type = book_type
            user_book.is_favorite = is_favorite
            user_book.save()

        return user_book, created

    @staticmethod
    def update_user_book(
        *,
        user_book,
        shelf_code=...,
        started_at=...,
        finished_at=...,
        book_type=...,
        is_favorite=...,
    ):
        if shelf_code is not ...:
            shelf = get_object_or_404(Shelf, code=shelf_code)
            user_book.shelf = shelf

        if started_at is not ...:
            user_book.started_at = started_at

        if finished_at is not ...:
            user_book.finished_at = finished_at

        if book_type is not ...:
            user_book.book_type = book_type

        if is_favorite is not ...:
            user_book.is_favorite = is_favorite

        user_book.save()
        return user_book
