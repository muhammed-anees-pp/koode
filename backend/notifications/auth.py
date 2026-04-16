import logging
from urllib.parse import parse_qs
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.authentication import JWTAuthentication


logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_for_token(token):
    authenticator = JWTAuthentication()
    validated_token = authenticator.get_validated_token(token)
    return authenticator.get_user(validated_token)


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token = params.get("token", [None])[0]

        if token:
            try:
                scope["user"] = await get_user_for_token(token)
            except Exception:
                logger.warning("Invalid notification websocket token", exc_info=True)
                scope["user"] = None

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
