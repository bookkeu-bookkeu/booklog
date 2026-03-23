from django.urls import path

from .views import BookListView, BookTestView

urlpatterns = [
    path("test/", BookTestView.as_view(), name="books-test"),
    path("", BookListView.as_view(), name="book-list"),
]