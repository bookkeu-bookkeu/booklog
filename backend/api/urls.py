from django.urls import include, path

from .views import health_check

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("users/", include("users.urls")),
    path("books/", include("books.urls")),
    path("reading/", include("reading.urls")),
]