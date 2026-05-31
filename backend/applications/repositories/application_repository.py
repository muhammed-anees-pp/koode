from applications.models import PsychologistApplication


"""
DB OPERATIONS RELATED TO APPLICATION OF PSYCHOLOGIST
"""
class ApplicationRepository:

    @staticmethod
    def get_by_user(user):
        return PsychologistApplication.objects.filter(user=user).first()

    @staticmethod
    def get_by_id(application_id):
        return PsychologistApplication.objects.filter(id=application_id).first()

    @staticmethod
    def create_application(**data):
        specializations = data.pop('specializations', [])
        application = PsychologistApplication.objects.create(**data)
        if specializations:
            application.specializations.set(specializations)
        return application

    @staticmethod
    def update_application(application, **data):
        specializations = data.pop('specializations', None)
        for field, value in data.items():
            setattr(application, field, value)
        application.save()
        if specializations is not None:
            application.specializations.set(specializations)
        return application

    @staticmethod
    def list_submitted_applications():
        return PsychologistApplication.objects.filter(status="SUBMITTED")

    @staticmethod
    def set_status(application, status):
        application.status = status
        application.save(update_fields=["status"])
        return application