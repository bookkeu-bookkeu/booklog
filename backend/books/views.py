from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Book
from .serializers import BookTestSerializer


class BookTestView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "message": "Books API is working!"
        })


class BookListView(generics.ListAPIView):
    queryset = Book.objects.all().order_by("-id")
    serializer_class = BookTestSerializer
    permission_classes = [permissions.AllowAny]