from django.db import transaction
from accounts.models import User


"""
DB OPERATIONS RELATED TO PSYCHOLOGIST
"""
class PsychologistRepository:
    @staticmethod
    @transaction.atomic
    def create_psychologist(user_data):
        user = User.objects.create_user(
            email=user_data["email"],
            full_name=user_data["full_name"],
            password=user_data["password"],
            role="PSYCHOLOGIST",
            is_active=False
        )
        return user
    
    @staticmethod
    def get_by_email(email):
        return User.objects.filter(email=email, role="PSYCHOLOGIST").first()