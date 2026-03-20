from django.core.management.base import BaseCommand
from rbti.models import RbtiType


class Command(BaseCommand):
    help = "Seed default RBTI types"

    def handle(self, *args, **options):
        rbti_types = [
            {
                "code": "RAN",
                "name": "구조를 받아들이는 독해가",
                "axis_1": "수용형",
                "axis_2": "분석형",
                "axis_3": "서사형",
                "description": "",
            },
            {
                "code": "RAS",
                "name": "핵심을 흡수하는 요약가",
                "axis_1": "수용형",
                "axis_2": "분석형",
                "axis_3": "문장형",
                "description": "",
            },
            {
                "code": "REN",
                "name": "이야기에 스며드는 공감가",
                "axis_1": "수용형",
                "axis_2": "공감형",
                "axis_3": "서사형",
                "description": "",
            },
            {
                "code": "RES",
                "name": "문장에 머무는 감성가",
                "axis_1": "수용형",
                "axis_2": "공감형",
                "axis_3": "문장형",
                "description": "",
            },
            {
                "code": "IAN",
                "name": "구조를 해체하는 탐구가",
                "axis_1": "탐구형",
                "axis_2": "분석형",
                "axis_3": "서사형",
                "description": "",
            },
            {
                "code": "IAS",
                "name": "문장을 파고드는 해석가",
                "axis_1": "탐구형",
                "axis_2": "분석형",
                "axis_3": "문장형",
                "description": "",
            },
            {
                "code": "IEN",
                "name": "이야기를 확장하는 사유가",
                "axis_1": "탐구형",
                "axis_2": "공감형",
                "axis_3": "서사형",
                "description": "",
            },
            {
                "code": "IES",
                "name": "감정을 해석하는 철학가",
                "axis_1": "탐구형",
                "axis_2": "공감형",
                "axis_3": "문장형",
                "description": "",
            },
        ]

        for item in rbti_types:
            obj, created = RbtiType.objects.update_or_create(
                code=item["code"],
                defaults=item,
            )
            status = "created" if created else "updated"
            self.stdout.write(self.style.SUCCESS(f"{obj.code} {status}"))