from rest_framework.permissions import BasePermission


"""
CHECK ADMIN
"""
class IsAdminUserRole(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == "ADMIN"
        )
