from django.db import migrations, models


OLD_TO_NEW_AXIS_VALUES = {
    "analytic_immersion": "receptive_inquisitive",
    "critical_empathy": "analytic_empathic",
    "practical_expansion": "narrative_sentence",
}


def forwards(apps, schema_editor):
    RbtiSurveyQuestion = apps.get_model("rbti", "RbtiSurveyQuestion")
    for old_value, new_value in OLD_TO_NEW_AXIS_VALUES.items():
        RbtiSurveyQuestion.objects.filter(axis_type=old_value).update(axis_type=new_value)


def backwards(apps, schema_editor):
    RbtiSurveyQuestion = apps.get_model("rbti", "RbtiSurveyQuestion")
    for old_value, new_value in OLD_TO_NEW_AXIS_VALUES.items():
        RbtiSurveyQuestion.objects.filter(axis_type=new_value).update(axis_type=old_value)


class Migration(migrations.Migration):

    dependencies = [
        ("rbti", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="rbtisurveyquestion",
            name="axis_type",
            field=models.CharField(
                choices=[
                    ("receptive_inquisitive", "Receptive / Inquisitive"),
                    ("analytic_empathic", "Analytic / Empathic"),
                    ("narrative_sentence", "Narrative / Sentence"),
                ],
                max_length=30,
            ),
        ),
        migrations.RunPython(forwards, backwards),
    ]