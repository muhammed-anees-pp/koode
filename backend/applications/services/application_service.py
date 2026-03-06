from django.utils import timezone
from applications.repositories.application_repository import ApplicationRepository


"""
APPLICATION SERVICES
"""
class ApplicationService:

    @staticmethod
    def submit_application(user, validated_data):
        full_name = validated_data.pop("full_name", None)
        if full_name:
            user.full_name = full_name
            user.save(update_fields=["full_name"])

        application = ApplicationRepository.get_by_user(user)

        if application is None:
            application = ApplicationRepository.create_application(
                user=user,
                **validated_data
            )
        else:
            application = ApplicationRepository.update_application(
                application,
                **validated_data
            )

        application.status = "SUBMITTED"
        application.submitted_at = timezone.now()
        application.save()
        return application


    @staticmethod
    def schedule_interview(application_id, interview_date):
        application = ApplicationRepository.get_by_id(application_id)

        if not application:
            raise ValueError("Application not found")

        application.interview_date = interview_date
        application.status = "INTERVIEW_SCHEDULED"
        application.save()
        return application