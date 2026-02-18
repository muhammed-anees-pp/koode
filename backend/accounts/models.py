from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager
from django.utils import timezone
import uuid


"""
USER MANAGER
"""
class UserManager(BaseUserManager):
    def create_user(self, email, full_name, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")

        if not full_name:
            raise ValueError("Full name is required")

        if extra_fields.get("role") == "ADMIN":
            raise ValueError("Can't create admin")

        email = self.normalize_email(email)

        extra_fields.setdefault("role", "PATIENT")
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(
            email=email,
            full_name=full_name,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, full_name, password=None, **extra_fields):
        if not password:
            raise ValueError("Superuser must have a password")

        if not full_name:
            raise ValueError("Full name is required")

        email = self.normalize_email(email)

        extra_fields["role"] = "ADMIN"
        extra_fields["is_staff"] = True
        extra_fields["is_superuser"] = True
        extra_fields["is_active"] = True

        user = self.model(
            email=email,
            full_name=full_name,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)
        return user


"""
USER MODEL
"""
class User(AbstractBaseUser, PermissionsMixin):

    ROLE_CHOICES = (
        ("ADMIN", "Admin"),
        ("PSYCHOLOGIST", "Psychologist"),
        ("PATIENT", "Patient"),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/",
        null=True,
        blank=True
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="PATIENT"
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.email
