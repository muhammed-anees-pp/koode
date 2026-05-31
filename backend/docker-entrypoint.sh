#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ] && [ "$1" = "daphne" ]; then
  python manage.py migrate --noinput
fi

exec "$@"
