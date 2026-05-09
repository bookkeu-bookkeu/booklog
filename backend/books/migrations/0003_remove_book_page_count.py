from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("books", "0002_book_kdc_book_subject"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="book",
            name="page_count",
        ),
    ]
