# reading/models.py

from django.db import models

from common.models import TimeStampedModel


class Shelf(models.Model):
    CODE_WANT = "WANT"
    CODE_READING = "READING"
    CODE_DONE = "DONE"

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=50)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name


class UserBook(TimeStampedModel):
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="user_books",
    )
    book = models.ForeignKey(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="user_books",
    )
    shelf = models.ForeignKey(
        "reading.Shelf",
        on_delete=models.PROTECT,
        related_name="user_books",
    )
    started_at = models.DateField(null=True, blank=True)
    finished_at = models.DateField(null=True, blank=True)
    book_type = models.CharField(max_length=30, null=True, blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)
    is_favorite = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "book"],
                name="unique_user_book",
            )
        ]

    def __str__(self):
        return f"{self.user.nickname} - {self.book.title}"