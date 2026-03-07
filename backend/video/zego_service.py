from django.conf import settings
from .token04 import generate_token04

"""
TOKEN GENERATE
"""
def generate_zego_token(user_id):
    app_id = int(settings.ZEGO_APP_ID)
    server_secret = settings.ZEGO_SERVER_SECRET
    effective_time = 3600 
    payload = ""
    token = generate_token04(
        app_id,
        user_id,
        server_secret,
        effective_time,
        payload
    )

    return token