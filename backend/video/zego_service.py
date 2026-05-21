from django.conf import settings
from .token04 import generate_token04

"""
TOKEN GENERATE FOR INTERVIEW ROOM
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


"""
TOKEN GENERATE FOR CONSULTATION ROOM
"""
def generate_consultation_zego_token(user_id):
    app_id = int(settings.ZEGO_CONSULTATION_APP_ID or 0)
    server_secret = settings.ZEGO_CONSULTATION_SERVER_SECRET
    token = generate_token04(
        app_id,
        user_id,
        server_secret,
        7200,
        "",
    )
    return token
