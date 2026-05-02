import random

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from reviews.models import Review
from users.models import User

from .models import (
    RbtiType,
    UserRbtiSnapshot,
    RbtiSurveyQuestion,
    RbtiSurveyChoice,
    RbtiSurveySession,
    RbtiSurveyAnswer,
)
from .serializers import (
    AdminAssignUserRbtiRequestSerializer,
    RBTI_AXIS_DEFINITIONS,
    RbtiTypeListSerializer,
    UserRbtiHistorySerializer,
    UserCurrentRbtiSerializer,
    RbtiSurveyQuestionSerializer,
    RbtiSurveySubmitSerializer,
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


class UserRbtiHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            RbtiSurveySession.objects.select_related("rbti_type")
            .filter(user=request.user, rbti_type__isnull=False)
            .order_by("-created_at", "-id")
        )
        serializer = UserRbtiHistorySerializer(queryset, many=True)
        return Response(
            {
                "count": len(serializer.data),
                "results": serializer.data,
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


class RbtiSurveyQuestionListAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        RBTI 설문 문항 조회 API

        GET /api/rbti/questions/
        GET /api/rbti/questions/?random=true
        """

        choice_queryset = RbtiSurveyChoice.objects.filter(is_active=True).order_by(
            "sort_order",
            "id",
        )

        questions = list(
            RbtiSurveyQuestion.objects.filter(is_active=True)
            .prefetch_related(Prefetch("choices", queryset=choice_queryset))
            .order_by("order_no", "id")
        )

        random_option = request.query_params.get("random", "false").lower()

        if random_option in ["true", "1", "yes", "y"]:
            random.shuffle(questions)

        serializer = RbtiSurveyQuestionSerializer(questions, many=True)

        return Response(
            {
                "count": len(questions),
                "questions": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class RbtiSurveySubmitAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        """
        RBTI 설문 제출 API

        요청 예시:
        {
            "is_retest": false,
            "answers": [
                {"question_id": 1, "choice_id": 3},
                {"question_id": 2, "choice_id": 8}
            ]
        }
        """

        serializer = RbtiSurveySubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answers_data = serializer.validated_data["answers"]
        requested_is_retest = serializer.validated_data.get("is_retest", False)

        active_question_count = RbtiSurveyQuestion.objects.filter(
            is_active=True
        ).count()

        if active_question_count == 0:
            return Response(
                {"detail": "활성화된 RBTI 문항이 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(answers_data) != active_question_count:
            return Response(
                {
                    "detail": f"활성화된 문항 {active_question_count}개에 모두 응답해야 합니다.",
                    "submitted_count": len(answers_data),
                    "required_count": active_question_count,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        question_ids = [item["question_id"] for item in answers_data]

        if len(question_ids) != len(set(question_ids)):
            return Response(
                {"detail": "같은 문항에 중복 응답할 수 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        questions = {
            question.id: question
            for question in RbtiSurveyQuestion.objects.filter(
                id__in=question_ids,
                is_active=True,
            ).prefetch_related("choices")
        }

        if len(questions) != len(question_ids):
            return Response(
                {"detail": "존재하지 않거나 비활성화된 문항이 포함되어 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        choice_ids = [item["choice_id"] for item in answers_data]

        choices = {
            choice.id: choice
            for choice in RbtiSurveyChoice.objects.filter(
                id__in=choice_ids,
                is_active=True,
            ).select_related("question")
        }

        if len(choices) != len(choice_ids):
            return Response(
                {"detail": "존재하지 않거나 비활성화된 선택지가 포함되어 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_scores = {
            "RI": 0,
            "AE": 0,
            "NS": 0,
        }

        max_scores = {
            "RI": 0,
            "AE": 0,
            "NS": 0,
        }

        answer_objects = []

        for item in answers_data:
            question = questions[item["question_id"]]
            choice = choices[item["choice_id"]]

            if choice.question_id != question.id:
                return Response(
                    {
                        "detail": "선택지가 해당 문항에 속하지 않습니다.",
                        "question_id": question.id,
                        "choice_id": choice.id,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            axis_key = normalize_axis_type(question.axis_type)

            if axis_key is None:
                return Response(
                    {
                        "detail": "알 수 없는 axis_type입니다.",
                        "question_id": question.id,
                        "axis_type": question.axis_type,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            raw_scores[axis_key] += choice.score_value
            max_scores[axis_key] += get_question_max_score(question)

            answer_objects.append(
                {
                    "question": question,
                    "choice": choice,
                    "answer_value": choice.score_value,
                }
            )

        result_code = make_rbti_code(raw_scores)

        rbti_type = RbtiType.objects.filter(code=result_code).first()

        if not rbti_type:
            return Response(
                {
                    "detail": f"{result_code} 유형이 rbti_types 테이블에 없습니다.",
                    "result_code": result_code,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        percentage_scores = make_percentage_scores(raw_scores, max_scores)
        has_current_rbti = UserRbtiSnapshot.objects.filter(
            user=request.user,
            is_current=True,
        ).exists()
        is_retest = requested_is_retest or has_current_rbti

        UserRbtiSnapshot.objects.filter(
            user=request.user,
            is_current=True,
        ).update(is_current=False)

        session = RbtiSurveySession.objects.create(
            user=request.user,
            rbti_type=rbti_type,
            analytic_score=percentage_scores["R"],
            immersion_score=percentage_scores["I"],
            critical_score=percentage_scores["A"],
            empathy_score=percentage_scores["E"],
            practical_score=percentage_scores["N"],
            expansion_score=percentage_scores["S"],
            is_retest=is_retest,
        )

        for answer in answer_objects:
            RbtiSurveyAnswer.objects.create(
                session=session,
                question=answer["question"],
                choice=answer["choice"],
                answer_value=answer["answer_value"],
            )

        snapshot = UserRbtiSnapshot.objects.create(
            user=request.user,
            rbti_type=rbti_type,
            analytic_score=percentage_scores["R"],
            immersion_score=percentage_scores["I"],
            critical_score=percentage_scores["A"],
            empathy_score=percentage_scores["E"],
            practical_score=percentage_scores["N"],
            expansion_score=percentage_scores["S"],
            source_type="survey",
            source_ref_id=session.id,
            is_current=True,
        )

        out = UserCurrentRbtiSerializer(snapshot)

        return Response(
            {
                "detail": "RBTI 검사가 저장되었습니다.",
                "axis_definitions": RBTI_AXIS_DEFINITIONS,
                "session_id": session.id,
                "saved_answer_count": len(answer_objects),
                "raw_scores": raw_scores,
                "percentage_scores": percentage_scores,
                "current_rbti": out.data,
            },
            status=status.HTTP_201_CREATED,
        )


def normalize_axis_type(axis_type):
    """
    axis_type을 계산용 키로 변환한다.

    RI: 수용형(R) / 탐구형(I)
    AE: 분석형(A) / 공감형(E)
    NS: 서사형(N) / 문장형(S)
    """

    axis_type = str(axis_type).lower()

    ri_values = [
        "ri",
        "r_i",
        "receptive_inquisitive",
        "attitude",
        "reading_attitude",
        "thought_attitude",
        "acceptance_inquiry",
        "analytic_immersion",
    ]

    ae_values = [
        "ae",
        "a_e",
        "analytic_empathic",
        "interpretation",
        "interpretation_perspective",
        "analysis_empathy",
        "critical_empathy",
    ]

    ns_values = [
        "ns",
        "n_s",
        "appreciation_unit",
        "narrative_sentence",
        "practical_expansion",
    ]

    if axis_type in ri_values:
        return "RI"

    if axis_type in ae_values:
        return "AE"

    if axis_type in ns_values:
        return "NS"

    return None


def get_question_max_score(question):
    scores = [
        abs(choice.score_value)
        for choice in question.choices.all()
        if choice.is_active
    ]

    if not scores:
        return 0

    return max(scores)


def make_rbti_code(raw_scores):
    """
    점수 방향:
    RI: 음수면 R, 양수면 I
    AE: 음수면 A, 양수면 E
    NS: 음수면 N, 양수면 S

    0점이면 왼쪽 축인 R/A/N으로 처리한다.
    """

    first = "I" if raw_scores["RI"] > 0 else "R"
    second = "E" if raw_scores["AE"] > 0 else "A"
    third = "S" if raw_scores["NS"] > 0 else "N"

    return first + second + third


def make_percentage_scores(raw_scores, max_scores):
    ri_left, ri_right = split_axis_percentage(
        raw_scores["RI"],
        max_scores["RI"],
    )
    ae_left, ae_right = split_axis_percentage(
        raw_scores["AE"],
        max_scores["AE"],
    )
    ns_left, ns_right = split_axis_percentage(
        raw_scores["NS"],
        max_scores["NS"],
    )

    return {
        "R": ri_left,
        "I": ri_right,
        "A": ae_left,
        "E": ae_right,
        "N": ns_left,
        "S": ns_right,
    }


def split_axis_percentage(raw_score, max_score):
    if max_score <= 0:
        return 50, 50

    raw_score = max(-max_score, min(max_score, raw_score))

    right_percentage = round(((raw_score + max_score) / (2 * max_score)) * 100)
    left_percentage = 100 - right_percentage

    return left_percentage, right_percentage
