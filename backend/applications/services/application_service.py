import logging

from django.utils import timezone
from applications.repositories.application_repository import ApplicationRepository


logger = logging.getLogger(__name__)


"""
APPLICATION SERVICES
"""
class ApplicationService:

    @staticmethod
    def submit_application(user, validated_data):
        logger.info("Submitting application for user %s", user.id)
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
        logger.info("Application %s saved as SUBMITTED for user %s", application.id, user.id)
        return application


    @staticmethod
    def schedule_interview(application_id, interview_date):
        application = ApplicationRepository.get_by_id(application_id)

        if not application:
            logger.warning("Interview scheduling failed because application %s was not found", application_id)
            raise ValueError("Application not found")

        application.interview_date = interview_date
        application.status = "INTERVIEW_SCHEDULED"
        application.save()
        logger.info("Interview scheduled on application %s", application.id)
        return application
