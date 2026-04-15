from rest_framework import serializers
from django.db import transaction
from .models import Availability, AvailableSlot, Booking


"""
AVAILABLE SLOT SERIALIZER
"""
class AvailableSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AvailableSlot
        fields = [
            "id",
            "start_time",
            "end_time",
            "is_booked",
        ]

"""
AVAILABILITY SERIALIZER
"""
class AvailabilitySerializer(serializers.ModelSerializer):
    slots = AvailableSlotSerializer(many=True, read_only=True)

    class Meta:
        model = Availability
        fields = [
            "id",
            "date",
            "slots",
        ]

"""
CREATE SLOTS
"""
class CreateAvailabilitySerializer(serializers.Serializer):
    date = serializers.DateField()
    slots = serializers.ListField(child=serializers.DictField(),allow_empty=False)

    def validate_slots(self, value):
        if not value:
            raise serializers.ValidationError("At least one slot is required")

        for slot in value:
            if "start_time" not in slot or "end_time" not in slot:
                raise serializers.ValidationError(
                    "Each slot must have start_time and end_time"
                )
        return value

    def create(self, validated_data):
        psychologist = self.context["psychologist"]
        date = validated_data["date"]
        slots_data = validated_data["slots"]

        with transaction.atomic():
            availability, created = Availability.objects.get_or_create(psychologist=psychologist,date=date)
            created_slots = []

            for slot in slots_data:
                slot_obj, _ = AvailableSlot.objects.get_or_create(availability=availability, start_time=slot["start_time"], end_time=slot["end_time"],)
                created_slots.append(slot_obj)

        return availability

