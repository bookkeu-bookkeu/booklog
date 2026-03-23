from django.urls import path

from .views import UserBookDetailAPIView, UserBookListCreateAPIView

urlpatterns = [
    path("user-books/", UserBookListCreateAPIView.as_view(), name="user-book-list-create"),
    path("user-books/<int:pk>/", UserBookDetailAPIView.as_view(), name="user-book-detail"),
]