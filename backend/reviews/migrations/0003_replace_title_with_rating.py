from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("reviews", "0002_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="review",
            name="title",
        ),
        migrations.AddField(
            model_name="review",
            name="rating",
            field=models.PositiveSmallIntegerField(
                default=3,
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(5),
                ],
            ),
        ),
    ]
