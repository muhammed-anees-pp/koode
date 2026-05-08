from django.conf import settings
import hashlib
import hmac
import secrets
import time
import requests
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


"""
CONSULTATION RECORDING
"""
def _recording_signature(app_id, nonce, server_secret, timestamp):
    raw = f"{app_id}{nonce}{server_secret}{timestamp}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _recording_common_params(action):
    app_id = int(settings.ZEGO_CONSULTATION_APP_ID)
    nonce = secrets.token_hex(8)
    timestamp = int(time.time())
    return {
        "Action": action,
        "AppId": app_id,
        "SignatureNonce": nonce,
        "SignatureVersion": "2.0",
        "Timestamp": timestamp,
        "Signature": _recording_signature(
            app_id,
            nonce,
            settings.ZEGO_CONSULTATION_SERVER_SECRET,
            timestamp,
        ),
    }

"""
RECORDING STORAGE
"""
def _recording_storage_params():
    storage = {
        "Vendor": settings.ZEGO_RECORDING_S3_VENDOR,
        "Region": settings.AWS_S3_REGION_NAME,
        "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
        "AccessKeyId": settings.AWS_ACCESS_KEY_ID,
        "AccessKeySecret": settings.AWS_SECRET_ACCESS_KEY,
    }
    if settings.ZEGO_RECORDING_S3_ENDPOINT:
        storage["EndPoint"] = settings.ZEGO_RECORDING_S3_ENDPOINT
    return storage


def recording_configured():
    return all([
        settings.ZEGO_CONSULTATION_RECORDING_ENABLED,
        settings.ZEGO_CONSULTATION_APP_ID,
        settings.ZEGO_CONSULTATION_SERVER_SECRET,
        settings.AWS_STORAGE_BUCKET_NAME,
        settings.AWS_ACCESS_KEY_ID,
        settings.AWS_SECRET_ACCESS_KEY,
        settings.AWS_S3_REGION_NAME,
    ])


def verify_recording_callback_signature(payload):
    callback_secret = getattr(settings, "ZEGO_RECORDING_CALLBACK_SECRET", "")
    if not callback_secret:
        return True

    signature = str(payload.get("signature") or "")
    timestamp = str(payload.get("timestamp") or "")
    nonce = str(payload.get("nonce") or "")
    if not signature or not timestamp or not nonce:
        return False

    raw = "".join(sorted([callback_secret, timestamp, nonce]))
    expected = hashlib.sha1(raw.encode("utf-8")).hexdigest()
    return hmac.compare_digest(expected, signature)


"""
START CONSULTATION RECORDING
"""
def start_consultation_recording(room_id, client_task_id):
    if not recording_configured():
        return {
            "skipped": True,
            "message": "Consultation recording is not configured.",
        }

    mix_output_stream_id = f"mix_{room_id}"[:256]
    body = {
        "RoomId": room_id,
        "RecordInputParams": {
            "RecordMode": 2,
            "StreamType": 3,
            "MaxIdleTime": 300,
            "MaxRecordTime": settings.ZEGO_RECORDING_MAX_RECORD_TIME_SECONDS,
            "FillBlank": True,
            "MixConfig": {
                "MixMode": 2,
                "MixOutputStreamId": mix_output_stream_id,
                "MixOutputVideoConfig": {
                    "Width": 1280,
                    "Height": 720,
                    "Fps": 15,
                    "Bitrate": 1500000,
                },
                "MixOutputAudioConfig": {
                    "Bitrate": 48000,
                },
            },
        },
        "RecordOutputParams": {
            "OutputFileFormat": "mp4",
            "OutputFolder": f"{settings.ZEGO_RECORDING_OUTPUT_FOLDER}/{room_id}",
            "OutputFileRule": 1,
            "StorageParams": _recording_storage_params(),
        },
        "ClientTaskId": client_task_id,
    }
    if settings.ZEGO_RECORDING_CALLBACK_URL:
        body["RecordOutputParams"]["CallbackUrl"] = settings.ZEGO_RECORDING_CALLBACK_URL

    response = requests.post(
        settings.ZEGO_CLOUD_RECORDING_API_URL,
        params=_recording_common_params("StartRecord"),
        json=body,
        timeout=15,
    )
    response.raise_for_status()
    return response.json()



"""
STOP CONSULTATION RECORDING
"""
def stop_consultation_recording(task_id):
    if not recording_configured() or not task_id:
        return {
            "skipped": True,
            "message": "Consultation recording is not active or not configured.",
        }

    response = requests.post(
        settings.ZEGO_CLOUD_RECORDING_API_URL,
        params=_recording_common_params("StopRecord"),
        json={"TaskId": task_id},
        timeout=15,
    )
    response.raise_for_status()
    return response.json()
