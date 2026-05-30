from django.contrib import admin
from chat.models import ChatRoom, Message


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ("id", "appointment", "patient", "psychologist", "is_active", "created_at")
    list_filter = ("is_active", "created_at")
    search_fields = ("appointment__id", "patient__user__email", "psychologist__user__email")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "sender", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("content", "sender__email", "room__appointment__id")
