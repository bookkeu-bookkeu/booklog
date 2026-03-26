from django.urls import path

from .views import (
	AdminAssignUserRbtiAPIView,
	BookRbtiFilterOptionAPIView,
	CurrentUserRbtiAPIView,
	RbtiAxisDefinitionAPIView,
	RbtiTypeListAPIView,
)

urlpatterns = [
	path("types/", RbtiTypeListAPIView.as_view(), name="rbti-type-list"),
	path("axes/", RbtiAxisDefinitionAPIView.as_view(), name="rbti-axis-definitions"),
	path("me/", CurrentUserRbtiAPIView.as_view(), name="current-user-rbti"),
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
