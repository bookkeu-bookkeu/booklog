from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwner(BasePermission):
    """
    obj.user 가 request.user 와 같은지 확인
    서재, 필사노트, 내 데이터용
    """
    message = "본인 데이터만 접근할 수 있습니다."

    def has_object_permission(self, request, view, obj):
        return getattr(obj, "user_id", None) == request.user.id


class IsReviewVisibleOrOwner(BasePermission):
    """
    리뷰 상세 권한:
    - SAFE_METHODS(GET, HEAD, OPTIONS):
        public 이면 로그인 사용자 누구나 가능
        private 이면 작성자만 가능
    - 수정/삭제:
        작성자만 가능
    """
    message = "이 리뷰에 접근할 권한이 없습니다."

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return obj.visibility == "public" or obj.user_id == request.user.id

        return obj.user_id == request.user.id


class CanLikeReview(BasePermission):
    """
    리뷰 좋아요 권한:
    - 공개 리뷰만 가능
    - 본인 리뷰는 불가
    """
    message = "이 리뷰에는 좋아요를 누를 수 없습니다."

    def has_object_permission(self, request, view, obj):
        if obj.visibility != "public":
            self.message = "공개 리뷰에만 좋아요를 누를 수 있습니다."
            return False

        if obj.user_id == request.user.id:
            self.message = "본인 리뷰에는 좋아요를 누를 수 없습니다."
            return False

        return True