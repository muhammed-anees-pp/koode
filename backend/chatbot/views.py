from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from patients.permissions import IsPatient
from .models import ChatbotConversation, ChatbotMessage
from .serializers import ChatbotMessageSerializer, ChatbotPromptSerializer
from .services import get_chatbot_reply


"""
CHAT BOT MESSAGE VIEW
"""
class ChatbotMessageView(APIView):
    permission_classes = [IsAuthenticated, IsPatient]

    def get(self, request):
        conversation = self._get_conversation(request.user)
        messages = conversation.messages.all()[:80]
        return Response(
            {
                "conversation_id": conversation.id,
                "messages": ChatbotMessageSerializer(messages, many=True).data,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        serializer = ChatbotPromptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = self._get_conversation(request.user)
        user_message = serializer.validated_data["message"]

        ChatbotMessage.objects.create(conversation=conversation, role="USER", content=user_message,)

        ai_result = get_chatbot_reply(user_message)
        bot_message = ChatbotMessage.objects.create(
            conversation=conversation,
            role="BOT",
            content=ai_result["reply"],
            intent=ai_result["intent"],
            confidence=ai_result["confidence"],
        )

        return Response(
            {
                "reply": ChatbotMessageSerializer(bot_message).data,
                "intent": ai_result["intent"],
                "confidence": ai_result["confidence"],
            },
            status=status.HTTP_200_OK,
        )

    def _get_conversation(self, user):
        conversation = ChatbotConversation.objects.filter(patient=user).first()
        if conversation:
            return conversation
        return ChatbotConversation.objects.create(patient=user)
