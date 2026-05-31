from rest_framework import serializers
from accounts.models import User
from .models import PatientProfile


"""
USER PROFILE SERIALIZER
"""
class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(required=False, allow_null=True, use_url=True)

    class Meta:
        model = User
        fields = ['full_name', 'email', 'profile_picture']
        read_only_fields = ['email']


"""
PATIENT PROFILE SERIALIZER
"""
class PatientProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(required=False)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=PatientProfile.GENDER_CHOICES, required=False, allow_blank=True, allow_null=True)
    emergency_contact_name  = serializers.CharField(required=False, allow_blank=True)
    emergency_contact_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = PatientProfile
        fields = [
            'patient_id', 'user', 'phone_number', 'date_of_birth', 'gender',
            'emergency_contact_name', 'emergency_contact_number', 'created_at'
        ]
        read_only_fields = ['patient_id', 'created_at']

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()

        return instance
