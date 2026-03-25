# books/serializers.py
from rest_framework import serializers

class ExternalBookItemSerializer(serializers.Serializer):
    source = serializers.CharField(default="kakao")
    external_api_id = serializers.CharField()
    title = serializers.CharField()
    contents = serializers.CharField(allow_blank=True)
    url = serializers.URLField()
    isbn = serializers.CharField(allow_blank=True)
    isbn10 = serializers.CharField(allow_blank=True, required=False)
    isbn13 = serializers.CharField(allow_blank=True, required=False)
    authors = serializers.ListField(child=serializers.CharField(), default=list)
    translators = serializers.ListField(child=serializers.CharField(), default=list)
    publisher = serializers.CharField(allow_blank=True)
    published_at = serializers.CharField(allow_blank=True)
    thumbnail = serializers.CharField(allow_blank=True)
    price = serializers.IntegerField(required=False)
    sale_price = serializers.IntegerField(required=False)
    status = serializers.CharField(allow_blank=True, required=False)
    is_in_library = serializers.BooleanField(required=False)


class ExternalBookSearchResponseSerializer(serializers.Serializer):
    total_count = serializers.IntegerField()
    pageable_count = serializers.IntegerField()
    is_end = serializers.BooleanField()
    page = serializers.IntegerField()
    size = serializers.IntegerField()
    results = ExternalBookItemSerializer(many=True)


class BookImportRequestSerializer(serializers.Serializer):
    isbn13 = serializers.CharField(min_length=13, max_length=13)

    def validate_isbn13(self, value):
        isbn13 = value.strip()

        if not isbn13.isdigit():
            raise serializers.ValidationError("isbn13은 13자리 숫자여야 합니다.")

        return isbn13