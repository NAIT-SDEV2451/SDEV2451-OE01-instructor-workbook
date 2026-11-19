from django.contrib import admin

from event_tickets.models import Event, Order, Ticket, TicketTier, Venue

admin.site.register(Venue)
admin.site.register(Event)
admin.site.register(TicketTier)
admin.site.register(Ticket)
admin.site.register(Order)
