from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("admin_panel", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="AdminSettingsData",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("data", models.JSONField(default=dict)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"abstract": False},
        ),
    ]
