from psychologists.models import PsychologistProfile, Specialization
import shutil
import os
from django.core.files.base import ContentFile



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

        user_fields_to_update = []

        if application.profile_picture and not user.profile_picture:
            try:
                pic_file = application.profile_picture
                pic_file.open("rb")
                content = pic_file.read()
                pic_file.close()
                filename = os.path.basename(pic_file.name)
                user.profile_picture.save(filename, ContentFile(content), save=False)
                user_fields_to_update.append("profile_picture")
            except Exception:
                pass

        if application.full_name and not user.full_name:
            user.full_name = application.full_name
            user_fields_to_update.append("full_name")

        if user_fields_to_update:
            user.save(update_fields=user_fields_to_update)

        return profile