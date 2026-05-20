from rest_framework import serializers
from .models import ChatbotMessage


"""
CHAT BOT INPUT
"""
class ChatbotPromptSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True)


"""
CHAT BOT MESSAGE
"""
class ChatbotMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatbotMessage
        fields = ["id", "role", "content", "intent", "confidence", "created_at"]
