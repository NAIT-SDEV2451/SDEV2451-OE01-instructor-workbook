from django.conf import settings
from django.db import models


class Venue(models.Model):
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="venues",
    )

    def __str__(self):
        return self.name


class Event(models.Model):
    name = models.CharField(max_length=255)
    date_time = models.DateTimeField()
    venue = models.ForeignKey(
        Venue,
        on_delete=models.CASCADE,
        related_name="events",
    )
    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="organized_events",
    )

    def __str__(self):
        return self.name


class TicketTier(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="ticket_tiers",
    )

    def __str__(self):
        return f"{self.name} — {self.event}"


class Ticket(models.Model):
    tier = models.ForeignKey(
        TicketTier,
        on_delete=models.CASCADE,
        related_name="tickets",
    )

    def __str__(self):
        return f"Ticket ({self.tier})"


class Order(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    tickets = models.ManyToManyField(Ticket, related_name="orders")

    @property
    def total_price(self):
        return sum(ticket.tier.price for ticket in self.tickets.all())

    def __str__(self):
        return f"Order #{self.pk} — {self.customer}"
