from rest_framework import serializers

from .models import QuoteNote, Review


class ReviewCreateUpdateSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(required=False)
    user_book_id = serializers.IntegerField(required=False, allow_null=True)
    title = serializers.CharField(max_length=255)
    content = serializers.CharField()
    visibility = serializers.ChoiceField(choices=["public", "private"], default="public")


class ReviewListSerializer(serializers.ModelSerializer):
    user_nickname = serializers.CharField(source="user.nickname", read_only=True)
    book_title = serializers.CharField(source="book.title", read_only=True)
    book_thumbnail_url = serializers.CharField(source="book.thumbnail_url", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "user_nickname",
            "book",
            "book_title",
            "book_thumbnail_url",
            "title",
            "content",
            "visibility",
            "like_count",
            "created_at",
            "updated_at",
        ]


class ReviewDetailSerializer(serializers.ModelSerializer):
    user_nickname = serializers.CharField(source="user.nickname", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "user_nickname",
            "book",
            "user_book",
            "title",
            "content",
            "visibility",
            "like_count",
            "created_at",
            "updated_at",
        ]


class QuoteNoteCreateUpdateSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(required=False)
    user_book_id = serializers.IntegerField(required=False, allow_null=True)
    quoted_text = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True)
    page_number = serializers.IntegerField(required=False, allow_null=True)


class QuoteNoteListSerializer(serializers.ModelSerializer):
    user_nickname = serializers.CharField(source="user.nickname", read_only=True)
    book_title = serializers.CharField(source="book.title", read_only=True)

    class Meta:
        model = QuoteNote
        fields = [
            "id",
            "user_nickname",
            "book",
            "book_title",
            "quoted_text",
            "note",
            "page_number",
            "created_at",
            "updated_at",
        ]


class QuoteNoteDetailSerializer(serializers.ModelSerializer):
    user_nickname = serializers.CharField(source="user.nickname", read_only=True)

    class Meta:
        model = QuoteNote
        fields = [
            "id",
            "user",
            "user_nickname",
            "book",
            "user_book",
            "quoted_text",
            "note",
            "page_number",
            "created_at",
            "updated_at",
        ]