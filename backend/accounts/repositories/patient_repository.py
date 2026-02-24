from django.db import transaction
from accounts.models import User
from patients.models import PatientProfile


"""
DB OPERATIONS RELATED TO PATIENT
"""
class PatientRepository:
    @staticmethod
    @transaction.atomic
    def create_patient_with_profile(user_data):
        user = User.objects.create_user(
            email=user_data["email"],
            full_name=user_data["full_name"],
            password=user_data["password"],
            role="PATIENT",
            is_active=False
        )

        PatientProfile.objects.create(
            user=user,
            phone_number="",
            date_of_birth=None,
            gender=None,
            emergency_contact_name="",
            emergency_contact_number="",
        )

        return user

    @staticmethod
    def get_by_email(email):
        return User.objects.filter(email=email, role="PATIENT").first()