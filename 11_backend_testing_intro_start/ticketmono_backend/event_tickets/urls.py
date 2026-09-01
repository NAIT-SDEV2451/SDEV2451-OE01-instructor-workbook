from rest_framework.routers import DefaultRouter

from .views import EventViewSet, OrderViewSet

router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("orders", OrderViewSet, basename="order")

urlpatterns = router.urls
