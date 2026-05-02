from django.urls import path

from .views import (
    AdminAssignUserRbtiAPIView,
    BookRbtiFilterOptionAPIView,
    CurrentUserRbtiAPIView,
    RbtiAxisDefinitionAPIView,
    RbtiTypeListAPIView,
    RbtiSurveyQuestionListAPIView,
    RbtiSurveySubmitAPIView,
)

urlpatterns = [
    path("types/", RbtiTypeListAPIView.as_view(), name="rbti-type-list"),
    path("axes/", RbtiAxisDefinitionAPIView.as_view(), name="rbti-axis-definitions"),
    path("me/", CurrentUserRbtiAPIView.as_view(), name="current-user-rbti"),
    path("questions/", RbtiSurveyQuestionListAPIView.as_view(), name="rbti-question-list"),
    path("submit/", RbtiSurveySubmitAPIView.as_view(), name="rbti-survey-submit"),
    path(
        "admin/assign/",
        AdminAssignUserRbtiAPIView.as_view(),
        name="admin-assign-user-rbti",
    ),
    path(
        "filters/",
        BookRbtiFilterOptionAPIView.as_view(),
        name="rbti-book-filter-options",
    ),
]