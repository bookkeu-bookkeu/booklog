from rest_framework import serializers

from .models import (
    RbtiType,
    UserRbtiSnapshot,
    RbtiSurveyQuestion,
    RbtiSurveyChoice,
    RbtiSurveySession,
)

RBTI_AXIS_DEFINITIONS = [
    {
        "axis": 1,
        "left_code": "R",
        "left_name": "수용형",
        "right_code": "I",
        "right_name": "탐구형",
    },
    {
        "axis": 2,
        "left_code": "A",
        "left_name": "분석형",
        "right_code": "E",
        "right_name": "공감형",
    },
    {
        "axis": 3,
        "left_code": "N",
        "left_name": "서사형",
        "right_code": "S",
        "right_name": "문장형",
    },
]


class RbtiTypeListSerializer(serializers.ModelSerializer):
    axis_definitions = serializers.SerializerMethodField()

    def get_axis_definitions(self, _obj):
        return RBTI_AXIS_DEFINITIONS

    class Meta:
        model = RbtiType
        fields = [
            "id",
            "code",
            "name",
            "axis_1",
            "axis_2",
            "axis_3",
            "description",
            "axis_definitions",
        ]


class UserCurrentRbtiSerializer(serializers.ModelSerializer):
    rbti_code = serializers.CharField(source="rbti_type.code", read_only=True)
    rbti_name = serializers.CharField(source="rbti_type.name", read_only=True)
    rbti_description = serializers.CharField(
        source="rbti_type.description", read_only=True
    )
    axis_1 = serializers.CharField(source="rbti_type.axis_1", read_only=True)
    axis_2 = serializers.CharField(source="rbti_type.axis_2", read_only=True)
    axis_3 = serializers.CharField(source="rbti_type.axis_3", read_only=True)

    class Meta:
        model = UserRbtiSnapshot
        fields = [
            "id",
            "rbti_code",
            "rbti_name",
            "rbti_description",
            "axis_1",
            "axis_2",
            "axis_3",
            "analytic_score",
            "immersion_score",
            "critical_score",
            "empathy_score",
            "practical_score",
            "expansion_score",
            "source_type",
            "source_ref_id",
            "created_at",
        ]


class UserRbtiHistorySerializer(serializers.ModelSerializer):
    rbti_code = serializers.CharField(source="rbti_type.code", read_only=True)
    rbti_name = serializers.CharField(source="rbti_type.name", read_only=True)

    class Meta:
        model = RbtiSurveySession
        fields = [
            "id",
            "rbti_code",
            "rbti_name",
            "created_at",
        ]


class AdminAssignUserRbtiRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    user_email = serializers.EmailField(required=False)
    rbti_code = serializers.CharField(max_length=10)
    source_type = serializers.ChoiceField(
        choices=["survey", "ai_review", "manual_reset"],
        default="manual_reset",
    )
    source_ref_id = serializers.IntegerField(required=False, allow_null=True)
    analytic_score = serializers.IntegerField(required=False, default=50)
    immersion_score = serializers.IntegerField(required=False, default=50)
    critical_score = serializers.IntegerField(required=False, default=50)
    empathy_score = serializers.IntegerField(required=False, default=50)
    practical_score = serializers.IntegerField(required=False, default=50)
    expansion_score = serializers.IntegerField(required=False, default=50)

    def validate(self, attrs):
        if not attrs.get("user_id") and not attrs.get("user_email"):
            raise serializers.ValidationError(
                "user_id 또는 user_email 중 하나는 반드시 필요합니다."
            )
        return attrs


class RbtiSurveyChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RbtiSurveyChoice
        fields = [
            "id",
            "label",
            "choice_text",
            "sort_order",
        ]


class RbtiSurveyQuestionSerializer(serializers.ModelSerializer):
    choices = serializers.SerializerMethodField()

    class Meta:
        model = RbtiSurveyQuestion
        fields = [
            "id",
            "question_text",
            "axis_type",
            "order_no",
            "choices",
        ]

    def get_choices(self, obj):
        choices = obj.choices.filter(is_active=True).order_by("sort_order", "id")
        return RbtiSurveyChoiceSerializer(choices, many=True).data


class RbtiSurveySubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    choice_id = serializers.IntegerField()


class RbtiSurveySubmitSerializer(serializers.Serializer):
    is_retest = serializers.BooleanField(default=False)
    answers = RbtiSurveySubmitAnswerSerializer(many=True)
