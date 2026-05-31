import os
from pathlib import Path
from dotenv import load_dotenv
from celery import Celery

BASE_DIR = Path(__file__).resolve().parent.parent
if os.getenv("SKIP_DOTENV", "False") != "True":
    load_dotenv(BASE_DIR / ".env")

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("config")

app.config_from_object("django.conf:settings", namespace="CELERY")

if os.getenv("REDIS_URL"):
    app.conf.update(
        broker_url=os.getenv("REDIS_URL"),
        result_backend=os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL")),
    )

app.autodiscover_tasks()
