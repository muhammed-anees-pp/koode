from rest_framework.permissions import BasePermission


class IsChatParticipant(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.can_participate(request.user)
