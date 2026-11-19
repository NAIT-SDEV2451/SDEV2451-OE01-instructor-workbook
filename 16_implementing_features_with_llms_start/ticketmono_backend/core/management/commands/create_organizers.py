from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

_ORGANIZERS = [
    {
        "id": 100,
        "username": "alice_organizer",
        "email": "alice@ticketmono.com",
        "first_name": "Alice",
        "last_name": "Johnson",
        "password": "Organizer@100",
        "role": "event_organizer",
    },
    {
        "id": 101,
        "username": "bob_organizer",
        "email": "bob@ticketmono.com",
        "first_name": "Bob",
        "last_name": "Smith",
        "password": "Organizer@101",
        "role": "event_organizer",
    },
]


class Command(BaseCommand):
    help = "Creates two event organizer users with IDs starting at 100."

    def handle(self, *args, **options):
        for organizer in _ORGANIZERS:
            user, created = User.objects.get_or_create(
                id=organizer["id"],
                defaults={
                    "username": organizer["username"],
                    "email": organizer["email"],
                    "first_name": organizer["first_name"],
                    "last_name": organizer["last_name"],
                    "role": organizer["role"],
                },
            )
            if created:
                user.set_password(organizer["password"])
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Created organizer '{user.username}' (id={user.id})"
                    )
                )
            else:
                self.stdout.write(
                    f"Organizer '{user.username}' (id={user.id}) already exists — skipped."
                )
