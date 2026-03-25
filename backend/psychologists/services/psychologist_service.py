from psychologists.models import PsychologistProfile, Specialization



"""
PSYCHOLOGIST SERVICES
"""
class PsychologistProfileService:
    @staticmethod
    def create_from_application(application, user):
        if PsychologistProfile.objects.filter(user=user).exists():
            return

        profile = PsychologistProfile(
            user=user,
            phone_number=application.phone_number or "",
            about=application.about or "",
            street_address=application.street_address or "",
            city=application.city or "",
            state=application.state or "",
            pincode=application.pincode or "",
            country=application.country or "India",
            job_title=application.job_title or "",
            years_of_experience=application.years_of_experience or 0,
            consultation_fee=application.consultation_fee or 0,
            verified=True,
            active=True,
        )

        if application.certificate_document:
            profile.certificate_document = application.certificate_document

        if application.audio_intro:
            profile.audio_intro = application.audio_intro

        profile.save()


        if hasattr(application, "specializations"):
            for spec in application.specializations.all():
                spec_obj, _ = Specialization.objects.get_or_create(name=spec.name)
                profile.specializations.add(spec_obj)

        return profile