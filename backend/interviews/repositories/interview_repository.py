from interviews.models import Interview


class InterviewRepository:
    @staticmethod
    def create(application, admin, scheduled_at, room_id):
        return Interview.objects.create(
            application=application,
            admin=admin,
            scheduled_at=scheduled_at,
            room_id=room_id,
        )

    @staticmethod
    def get_by_id(interview_id):
        return Interview.objects.filter(id=interview_id).first()

    @staticmethod
    def get_by_application(application):
        return Interview.objects.filter(application=application).first()

    @staticmethod
    def update_scheduled_at(interview, scheduled_at):
        interview.scheduled_at = scheduled_at
        interview.save(update_fields=["scheduled_at", "updated_at"])
        return interview
