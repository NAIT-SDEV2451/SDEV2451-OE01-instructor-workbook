from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_USER = "user"
    ROLE_EVENT_ORGANIZER = "event_organizer"

    ROLE_CHOICES = [
        (ROLE_USER, "User"),
        (ROLE_EVENT_ORGANIZER, "Event Organizer"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_USER,
    )
