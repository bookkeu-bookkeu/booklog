from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class SignUpSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "nickname", "password", "password_confirm"]

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")
        return value

    def validate_nickname(self, value):
        if User.objects.filter(nickname=value).exists():
            raise serializers.ValidationError("이미 사용 중인 닉네임입니다.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "비밀번호가 일치하지 않습니다."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )
        return user


class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "nickname",
            "status",
            "is_active",
            "is_staff",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class UserMeUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=False, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, required=False, min_length=8)

    def validate_email(self, value):
        user = self.context["request"].user
        normalized_email = User.objects.normalize_email(value)

        if (
            User.objects.exclude(id=user.id)
            .filter(email__iexact=normalized_email)
            .exists()
        ):
            raise serializers.ValidationError("이미 사용 중인 이메일입니다.")

        return normalized_email

    def validate(self, attrs):
        user = self.context["request"].user
        current_password = attrs.get("current_password")
        new_password = attrs.get("new_password")
        new_password_confirm = attrs.get("new_password_confirm")

        if not attrs.get("email") and not new_password:
            raise serializers.ValidationError("변경할 이메일 또는 새 비밀번호를 입력해 주세요.")

        if not user.check_password(current_password):
            raise serializers.ValidationError({"current_password": "현재 비밀번호가 올바르지 않습니다."})

        if new_password or new_password_confirm:
            if not new_password or not new_password_confirm:
                raise serializers.ValidationError(
                    {"new_password_confirm": "새 비밀번호를 모두 입력해 주세요."}
                )
            if new_password != new_password_confirm:
                raise serializers.ValidationError(
                    {"new_password_confirm": "새 비밀번호가 일치하지 않습니다."}
                )
            validate_password(new_password, user=user)

        return attrs

    def update(self, instance, validated_data):
        email = validated_data.get("email")
        new_password = validated_data.get("new_password")
        update_fields = []

        if email and instance.email != email:
            instance.email = email
            update_fields.append("email")

        if new_password:
            instance.set_password(new_password)
            update_fields.append("password")

        if update_fields:
            update_fields.append("updated_at")
            instance.save(update_fields=update_fields)

        return instance
