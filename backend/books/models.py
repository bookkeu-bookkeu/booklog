# books/models.py

from django.db import models
from django.db.models import Q

from common.models import TimeStampedModel


class Author(TimeStampedModel):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Book(TimeStampedModel):
    isbn13 = models.CharField(max_length=13, null=True, blank=True, unique=True)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    publisher = models.CharField(max_length=100, blank=True)
    published_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    page_count = models.PositiveIntegerField(null=True, blank=True)
    category = models.CharField(max_length=100, blank=True)
    thumbnail_url = models.URLField(blank=True)
    external_api_source = models.CharField(max_length=30, blank=True)
    external_api_id = models.CharField(max_length=100, blank=True)

    authors = models.ManyToManyField(
        "books.Author",
        through="books.BookAuthor",
        related_name="books",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["external_api_source", "external_api_id"],
                condition=~Q(external_api_source="") & ~Q(external_api_id=""),
                name="unique_book_external_source_id",
            )
        ]

    def __str__(self):
        return self.title


class BookAuthor(models.Model):
    ROLE_AUTHOR = "author"
    ROLE_TRANSLATOR = "translator"
    ROLE_EDITOR = "editor"

    ROLE_CHOICES = [
        (ROLE_AUTHOR, "Author"),
        (ROLE_TRANSLATOR, "Translator"),
        (ROLE_EDITOR, "Editor"),
    ]

    book = models.ForeignKey(
        "books.Book",
        on_delete=models.CASCADE,
        related_name="book_authors",
    )
    author = models.ForeignKey(
        "books.Author",
        on_delete=models.CASCADE,
        related_name="book_authors",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_AUTHOR)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["book", "author", "role"],
                name="unique_book_author_role",
            )
        ]

    def __str__(self):
        return f"{self.book.title} - {self.author.name} ({self.role})"