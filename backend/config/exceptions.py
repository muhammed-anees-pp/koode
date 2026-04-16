import logging

from django.conf import settings
from rest_framework import status
from rest_framework.views import exception_handler
from rest_framework.response import Response


logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get("request")
    view = context.get("view")

    request_path = request.get_full_path() if request else "unknown"
    view_name = view.__class__.__name__ if view else "unknown"

    if response is not None:
        if response.status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
            logger.exception(
                "API exception in %s for %s",
                view_name,
                request_path,
                exc_info=True,
            )
        elif response.status_code >= status.HTTP_400_BAD_REQUEST:
            logger.warning(
                "Handled API error in %s for %s: %s",
                view_name,
                request_path,
                exc,
            )
        return response

    logger.exception(
        "Unhandled exception in %s for %s",
        view_name,
        request_path,
        exc_info=True,
    )

    detail = "Internal server error"
    if settings.DEBUG:
        detail = str(exc)

    return Response(
        {"detail": detail},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
