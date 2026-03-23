from django.urls import path

from .views import (
    QuoteNoteDetailAPIView,
    QuoteNoteListCreateAPIView,
    ReviewDetailAPIView,
    ReviewLikeAPIView,
    ReviewListCreateAPIView,
)

urlpatterns = [
    path("", ReviewListCreateAPIView.as_view(), name="review-list-create"),
    path("<int:pk>/", ReviewDetailAPIView.as_view(), name="review-detail"),
    path("<int:pk>/like/", ReviewLikeAPIView.as_view(), name="review-like"),

    path("quotes/", QuoteNoteListCreateAPIView.as_view(), name="quote-note-list-create"),
    path("quotes/<int:pk>/", QuoteNoteDetailAPIView.as_view(), name="quote-note-detail"),
]