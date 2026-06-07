from django.urls import path
from .views import (
    BookImportAPIView,
    BookSearchAPIView,
    ExternalBookDetailAPIView,
    RbtiRecommendedBookAPIView,
)

urlpatterns = [
    path("search/", BookSearchAPIView.as_view(), name="book-search"),
    path(
        "recommendations/rbti/",
        RbtiRecommendedBookAPIView.as_view(),
        name="rbti-recommended-books",
    ),
    path("external/", ExternalBookDetailAPIView.as_view(), name="external-book-detail"),
    path("import/", BookImportAPIView.as_view(), name="book-import"),
]
