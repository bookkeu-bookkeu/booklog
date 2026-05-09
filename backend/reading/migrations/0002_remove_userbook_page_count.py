from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("reading", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="userbook",
            name="page_count",
        ),
    ]
