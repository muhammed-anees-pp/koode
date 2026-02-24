from rest_framework.permissions import BasePermission


"""
CHECK PSYCHOLOGIST
"""
class IsPsychologist(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == "PSYCHOLOGIST"
        )