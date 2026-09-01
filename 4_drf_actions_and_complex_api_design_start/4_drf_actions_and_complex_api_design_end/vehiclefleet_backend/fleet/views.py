from datetime import timedelta

from django.db.models import Avg, Count
from django.db.models.functions import TruncWeek
from django.utils import timezone
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from fleet.models import Driver, Trip, Vehicle
from fleet.serializers import DriverSerializer, TripSerializer, VehicleSerializer


class FleetStatsView(APIView):
    """
    APIView example — returns a summary count of vehicles, drivers, and trips.
    GET /api/v1/stats/
    """

    def get(self, request):
        avg = Trip.objects.aggregate(avg_distance=Avg("distance"))["avg_distance"]

        six_months_ago = timezone.now() - timedelta(weeks=26)
        weekly_avg_distance = list(
            Trip.objects
            .filter(start_time__gte=six_months_ago, distance__isnull=False)
            .annotate(week=TruncWeek("start_time"))
            .values("week")
            .annotate(avg_distance=Avg("distance"))
            .order_by("week")
            .values_list("week", "avg_distance")
        )

        return Response({
            "total_vehicles": Vehicle.objects.count(),
            "total_drivers": Driver.objects.count(),
            "total_trips": Trip.objects.count(),
            "avg_trip_distance": round(avg, 2) if avg is not None else None,
            "avg_distance_per_week": [
                {
                    "week": week.strftime("%Y-%m-%d"),
                    "avg_distance": round(float(avg_dist), 2),
                }
                for week, avg_dist in weekly_avg_distance
            ],
        })


class VehicleViewSet(ModelViewSet):
    """ViewSet — full CRUD for Vehicle."""
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    filter_backends = [SearchFilter]
    search_fields = ["make", "model", "license_plate"]


class DriverViewSet(ModelViewSet):
    """ViewSet — full CRUD for Driver."""
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name", "license_number", "email"]


class TripViewSet(ModelViewSet):
    """ViewSet — full CRUD for Trip."""
    serializer_class = TripSerializer

    def get_queryset(self):
        return Trip.objects.select_related("vehicle", "driver").all()
