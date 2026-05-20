from django.contrib import admin
from . models import ChatbotConversation, ChatbotMessage

# Register your models here.
admin.site.register(ChatbotConversation)
admin.site.register(ChatbotMessage)
