from django.urls import path
from .views import BookSearchAPIView, ExternalBookDetailAPIView, BookImportAPIView

urlpatterns = [
    path("search/", BookSearchAPIView.as_view(), name="book-search"),
    path("external/", ExternalBookDetailAPIView.as_view(), name="external-book-detail"),
    path("import/", BookImportAPIView.as_view(), name="book-import"),
]