from rest_framework import serializers
from .models import (Specialization, PsychologistProfile,)


"""
SPECIALIZATION SERIALIZER
"""
class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = [
            "id",
            "name",
        ]