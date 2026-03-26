from django.db.models import Count, Q
from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from reviews.models import Review
from users.models import User

from .models import RbtiType, UserRbtiSnapshot
from .serializers import (
	AdminAssignUserRbtiRequestSerializer,
	RBTI_AXIS_DEFINITIONS,
	RbtiTypeListSerializer,
	UserCurrentRbtiSerializer,
)


class RbtiTypeListAPIView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		queryset = RbtiType.objects.order_by("code")
		serializer = RbtiTypeListSerializer(queryset, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)


class BookRbtiFilterOptionAPIView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		book_id = request.query_params.get("book_id")
		if not book_id:
			return Response(
				{"detail": "book_id query parameter is required."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		queryset = (
			RbtiType.objects.annotate(
				public_review_count=Count(
					"user_snapshots__user__reviews",
					filter=Q(
						user_snapshots__is_current=True,
						user_snapshots__user__reviews__book_id=book_id,
						user_snapshots__user__reviews__visibility=Review.VISIBILITY_PUBLIC,
					),
					distinct=True,
				),
				my_review_count=Count(
					"user_snapshots__user__reviews",
					filter=Q(
						user_snapshots__is_current=True,
						user_snapshots__user__reviews__book_id=book_id,
						user_snapshots__user=request.user,
					),
					distinct=True,
				),
			)
			.order_by("code")
		)

		payload = [
			{
				"id": rbti.id,
				"code": rbti.code,
				"name": rbti.name,
				"axis_1": rbti.axis_1,
				"axis_2": rbti.axis_2,
				"axis_3": rbti.axis_3,
				"description": rbti.description,
				"axis_definitions": RBTI_AXIS_DEFINITIONS,
				"public_review_count": rbti.public_review_count,
				"my_review_count": rbti.my_review_count,
			}
			for rbti in queryset
		]

		return Response(payload, status=status.HTTP_200_OK)


class RbtiAxisDefinitionAPIView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		return Response(
			{"axis_definitions": RBTI_AXIS_DEFINITIONS},
			status=status.HTTP_200_OK,
		)


class CurrentUserRbtiAPIView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		current_snapshot = (
			UserRbtiSnapshot.objects.select_related("rbti_type")
			.filter(user=request.user, is_current=True)
			.order_by("-created_at")
			.first()
		)

		if not current_snapshot:
			return Response(
				{
					"has_rbti": False,
					"axis_definitions": RBTI_AXIS_DEFINITIONS,
					"current_rbti": None,
				},
				status=status.HTTP_200_OK,
			)

		serializer = UserCurrentRbtiSerializer(current_snapshot)
		return Response(
			{
				"has_rbti": True,
				"axis_definitions": RBTI_AXIS_DEFINITIONS,
				"current_rbti": serializer.data,
			},
			status=status.HTTP_200_OK,
		)


class AdminAssignUserRbtiAPIView(APIView):
	permission_classes = [IsAdminUser]

	@transaction.atomic
	def post(self, request):
		serializer = AdminAssignUserRbtiRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		payload = serializer.validated_data

		target_user = None
		if payload.get("user_id"):
			target_user = User.objects.filter(id=payload["user_id"]).first()
		elif payload.get("user_email"):
			target_user = User.objects.filter(email=payload["user_email"]).first()

		if not target_user:
			return Response(
				{"detail": "대상 사용자를 찾을 수 없습니다."},
				status=status.HTTP_404_NOT_FOUND,
			)

		rbti_code = payload["rbti_code"].strip().upper()
		rbti_type = RbtiType.objects.filter(code=rbti_code).first()
		if not rbti_type:
			return Response(
				{"detail": "유효하지 않은 rbti_code 입니다."},
				status=status.HTTP_400_BAD_REQUEST,
			)

		UserRbtiSnapshot.objects.filter(user=target_user, is_current=True).update(
			is_current=False
		)

		snapshot = UserRbtiSnapshot.objects.create(
			user=target_user,
			rbti_type=rbti_type,
			analytic_score=payload.get("analytic_score", 50),
			immersion_score=payload.get("immersion_score", 50),
			critical_score=payload.get("critical_score", 50),
			empathy_score=payload.get("empathy_score", 50),
			practical_score=payload.get("practical_score", 50),
			expansion_score=payload.get("expansion_score", 50),
			source_type=payload.get("source_type", "manual_reset"),
			source_ref_id=payload.get("source_ref_id"),
			is_current=True,
		)

		out = UserCurrentRbtiSerializer(snapshot)
		return Response(
			{
				"detail": "사용자 RBTI가 설정되었습니다.",
				"user_id": target_user.id,
				"user_email": target_user.email,
				"current_rbti": out.data,
			},
			status=status.HTTP_200_OK,
		)
