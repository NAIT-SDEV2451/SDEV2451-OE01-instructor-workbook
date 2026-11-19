from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class UserRegistrationViewTestCase(APITestCase):
    url = "/api/v1/auth/register/"

    def test_register_creates_user(self):
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "securepass123",
        }
        response = self.client.post(self.url, payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(response.data["message"], "User registered successfully.")

    def test_register_with_missing_fields_returns_400(self):
        payload = {"username": "newuser"}
        response = self.client.post(self.url, payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_register_with_duplicate_username_returns_400(self):
        User.objects.create_user(username="existing", email="a@example.com", password="pass1234")
        payload = {
            "username": "existing",
            "email": "b@example.com",
            "password": "pass1234",
        }
        response = self.client.post(self.url, payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 1)


class MeViewTestCase(APITestCase):
    url = "/api/v1/auth/me/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="user",
        )

    def test_me_returns_user_data(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], self.user.username)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["role"], self.user.role)
        self.assertEqual(response.data["id"], self.user.id)

    def test_me_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 401)
