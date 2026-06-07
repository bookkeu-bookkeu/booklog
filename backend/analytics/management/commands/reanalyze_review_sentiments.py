import sys
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from analytics.models import BookRbtiStat, ReviewAnalysisResult
from analytics.services import rebuild_book_rbti_stats


class Command(BaseCommand):
    help = "Reanalyze existing review sentiment scores and rebuild book RBTI stats."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Maximum number of review analysis rows to process.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Analyze and print changes without saving them.",
        )
        parser.add_argument(
            "--only-seed",
            action="store_true",
            default=False,
            help="Only process rows whose model_version starts with csv-seed.",
        )
        parser.add_argument(
            "--rebuild-stats-only",
            action="store_true",
            default=False,
            help="Skip sentiment analysis and only rebuild BookRbtiStat from current analysis rows.",
        )

    def handle(self, *args, **options):
        _ensure_ai_package_path()

        limit = options["limit"]
        dry_run = options["dry_run"]
        only_seed = options["only_seed"]
        rebuild_stats_only = options["rebuild_stats_only"]

        if rebuild_stats_only:
            return self._rebuild_all_stats(dry_run=dry_run)

        from ai.predictors.sentiment import analyze_review_sentiment

        queryset = (
            ReviewAnalysisResult.objects.select_related("review", "review__book")
            .order_by("review_id")
        )

        if only_seed:
            queryset = queryset.filter(model_version__startswith="csv-seed").exclude(
                model_version__contains="sentiment-v1"
            )

        if limit is not None:
            queryset = queryset[: max(limit, 0)]

        total = queryset.count() if limit is None else len(queryset)
        self.stdout.write(
            self.style.NOTICE(
                f"Sentiment reanalysis started: total={total}, dry_run={dry_run}, only_seed={only_seed}"
            )
        )

        updated_count = 0
        failed_count = 0
        touched_book_ids = set()

        for analysis in queryset.iterator():
            review = analysis.review

            try:
                sentiment = analyze_review_sentiment(review.content, review.rating)
            except Exception as exc:
                failed_count += 1
                self.stderr.write(
                    f"[FAIL] review_id={review.id} title={review.book.title!r}: {exc}"
                )
                continue

            next_score = round(float(sentiment["final_positive_score"]) * 100, 2)
            previous_score = round(float(analysis.sentiment_score), 2)
            next_model_version = _make_model_version(analysis.model_version)

            self.stdout.write(
                f"[OK] review_id={review.id} book_id={review.book_id} "
                f"{previous_score:.2f} -> {next_score:.2f}"
            )

            if not dry_run:
                analysis.sentiment_score = next_score
                analysis.model_version = next_model_version
                analysis.analyzed_at = timezone.now()
                analysis.save(
                    update_fields=[
                        "sentiment_score",
                        "model_version",
                        "analyzed_at",
                    ]
                )

            updated_count += 1
            touched_book_ids.add(review.book_id)

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "Dry run complete. No ReviewAnalysisResult or BookRbtiStat rows were saved."
                )
            )
        else:
            self._rebuild_stats_for_books(touched_book_ids)

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. updated={updated_count}, failed={failed_count}, books={len(touched_book_ids)}"
            )
        )

    def _rebuild_all_stats(self, dry_run=False):
        book_ids = set(
            ReviewAnalysisResult.objects.values_list("review__book_id", flat=True)
        )
        self.stdout.write(
            self.style.NOTICE(
                f"Rebuilding all book RBTI stats: books={len(book_ids)}, dry_run={dry_run}"
            )
        )

        if dry_run:
            return

        with transaction.atomic():
            BookRbtiStat.objects.all().delete()

        self._rebuild_stats_for_books(book_ids)
        self.stdout.write(self.style.SUCCESS("Book RBTI stats rebuilt."))

    def _rebuild_stats_for_books(self, book_ids):
        for book_id in sorted(book_ids):
            rebuild_book_rbti_stats(book_id)
            self.stdout.write(f"[STAT] rebuilt book_id={book_id}")


def _make_model_version(previous_model_version):
    base = str(previous_model_version or "").split("|sentiment")[0]
    next_version = f"{base}|sentiment-v1"
    return next_version[:50]


def _ensure_ai_package_path():
    project_root = Path(__file__).resolve().parents[4]
    project_root_path = str(project_root)
    if project_root_path not in sys.path:
        sys.path.insert(0, project_root_path)
