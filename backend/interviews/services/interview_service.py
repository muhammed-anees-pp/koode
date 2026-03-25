import uuid
from interviews.repositories.interview_repository import InterviewRepository


class InterviewService:

    @staticmethod
    def create_or_update_interview(application, admin, scheduled_at):
        """
        Creates a new Interview row for the application.
        If one already exists (re-scheduling), updates scheduled_at instead.
        """
        existing = InterviewRepository.get_by_application(application)

        if existing:
            return InterviewRepository.update_scheduled_at(existing, scheduled_at)

        room_id = f"interview_{uuid.uuid4()}"
        return InterviewRepository.create(
            application=application,
            admin=admin,
            scheduled_at=scheduled_at,
            room_id=room_id,
        )
