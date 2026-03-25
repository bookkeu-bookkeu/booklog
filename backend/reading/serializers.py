from rest_framework import serializers

from .models import Shelf, UserBook


class UserBookCreateUpdateSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(required=False)
    shelf_code = serializers.ChoiceField(choices=["WANT", "READING", "DONE"])
    started_at = serializers.DateField(required=False, allow_null=True)
    finished_at = serializers.DateField(required=False, allow_null=True)
    is_favorite = serializers.BooleanField(required=False)

    def validate(self, attrs):
        started_at = attrs.get("started_at")
        finished_at = attrs.get("finished_at")

        if started_at and finished_at and started_at > finished_at:
            raise serializers.ValidationError("started_at은 finished_at보다 늦을 수 없습니다.")

        return attrs


class UserBookListSerializer(serializers.ModelSerializer):
    shelf_code = serializers.CharField(source="shelf.code", read_only=True)
    shelf_name = serializers.CharField(source="shelf.name", read_only=True)
    book_id = serializers.IntegerField(source="book.id", read_only=True)
    book_title = serializers.CharField(source="book.title", read_only=True)
    book_thumbnail_url = serializers.CharField(source="book.thumbnail_url", read_only=True)
    book_isbn13 = serializers.CharField(source="book.isbn13", read_only=True)
    book_publisher = serializers.CharField(source="book.publisher", read_only=True)
    book_authors = serializers.SerializerMethodField()

    def get_book_authors(self, obj):
        return [author.name for author in obj.book.authors.all()]

    class Meta:
        model = UserBook
        fields = [
            "id",
            "book_id",
            "book_title",
            "book_thumbnail_url",
            "book_isbn13",
            "book_publisher",
            "book_authors",
            "shelf_code",
            "shelf_name",
            "started_at",
            "finished_at",
            "rating",
            "is_favorite",
            "created_at",
            "updated_at",
        ]


class UserBookDetailSerializer(serializers.ModelSerializer):
    shelf_code = serializers.CharField(source="shelf.code", read_only=True)
    shelf_name = serializers.CharField(source="shelf.name", read_only=True)

    book = serializers.SerializerMethodField()

    class Meta:
        model = UserBook
        fields = [
            "id",
            "book",
            "shelf_code",
            "shelf_name",
            "started_at",
            "finished_at",
            "rating",
            "is_favorite",
            "created_at",
            "updated_at",
        ]

    def get_book(self, obj):
        return {
            "id": obj.book.id,
            "title": obj.book.title,
            "isbn13": obj.book.isbn13,
            "publisher": obj.book.publisher,
            "thumbnail_url": obj.book.thumbnail_url,
        }