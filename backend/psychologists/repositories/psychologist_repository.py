from psychologists.models import (
    PsychologistProfile,
    PsychologistEducation,
    PsychologistExperience
)


class PsychologistRepository:

    @staticmethod
    def create_profile(**data):
        return PsychologistProfile.objects.create(**data)

    @staticmethod
    def get_by_user(user):
        return PsychologistProfile.objects.filter(user=user).first()

    @staticmethod
    def add_education(psychologist, **data):
        return PsychologistEducation.objects.create(
            psychologist=psychologist,
            **data
        )

    @staticmethod
    def add_experience(psychologist, **data):
        return PsychologistExperience.objects.create(
            psychologist=psychologist,
            **data
        )

    @staticmethod
    def add_session_minutes(psychologist, minutes):
        psychologist.total_session_minutes += minutes
        psychologist.save(update_fields=["total_session_minutes"])
        return psychologist