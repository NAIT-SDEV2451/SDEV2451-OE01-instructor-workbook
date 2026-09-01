from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Event, Order, Ticket, TicketTier, Venue

User = get_user_model()


class EventTicketsTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='attendee',
        )
        self.organizer = User.objects.create_user(
            username='organizer',
            password='testpass123',
            role='organizer',
        )
        self.venue = Venue.objects.create(
            name='Test Venue',
            address='123 Test St',
            owner=self.organizer,
        )
        self.event = Event.objects.create(
            name='Test Event',
            date_time=timezone.now(),
            venue=self.venue,
            organizer=self.organizer,
        )
        self.tier = TicketTier.objects.create(
            name='General Admission',
            price='25.00',
            event=self.event,
        )

    def test_order_total_price(self):
        ticket_1 = Ticket.objects.create(tier=self.tier)
        ticket_2 = Ticket.objects.create(tier=self.tier)
        order = Order.objects.create(customer=self.user)
        order.tickets.set([ticket_1, ticket_2])

        self.assertEqual(order.total_price, 50)

    def test_events_list_requires_authentication(self):
        response = self.client.get('/api/v1/events/')

        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_list_events(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/events/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_create_order(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'items': [
                {
                    'event_id': self.event.id,
                    'ticket_tier_id': self.tier.id,
                    'quantity': 2,
                }
            ]
        }
        response = self.client.post('/api/v1/orders/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.first()
        self.assertEqual(order.customer, self.user)
        self.assertEqual(order.tickets.count(), 2)

    def test_user_cannot_see_other_users_orders(self):
        other_user = User.objects.create_user(
            username='other',
            password='testpass123',
            role='attendee',
        )
        ticket = Ticket.objects.create(tier=self.tier)
        other_order = Order.objects.create(customer=other_user)
        other_order.tickets.set([ticket])

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/orders/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_order_detail_returns_nested_tickets(self):
        ticket = Ticket.objects.create(tier=self.tier)
        order = Order.objects.create(customer=self.user)
        order.tickets.set([ticket])

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/orders/{order.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('tickets', response.data)
        self.assertEqual(len(response.data['tickets']), 1)
        self.assertIn('tier', response.data['tickets'][0])
        self.assertEqual(response.data['tickets'][0]['tier']['name'], 'General Admission')
        self.assertIn('total_price', response.data)
