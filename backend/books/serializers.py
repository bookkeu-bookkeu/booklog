from rest_framework import serializers

from .models import Book


class BookTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "subtitle",
            "isbn13",
            "publisher",
            "published_date",
            "thumbnail_url",
            "created_at",
            "updated_at",
        ]