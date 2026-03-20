from django.core.management.base import BaseCommand
from reading.models import Shelf


class Command(BaseCommand):
    help = "Seed default shelves"

    def handle(self, *args, **options):
        shelves = [
            {"code": "WANT", "name": "읽고 싶은 책", "sort_order": 1},
            {"code": "READING", "name": "읽는 중", "sort_order": 2},
            {"code": "DONE", "name": "완료", "sort_order": 3},
        ]

        for shelf in shelves:
            obj, created = Shelf.objects.update_or_create(
                code=shelf["code"],
                defaults={
                    "name": shelf["name"],
                    "sort_order": shelf["sort_order"],
                },
            )
            status = "created" if created else "updated"
            self.stdout.write(self.style.SUCCESS(f"{obj.code} {status}"))