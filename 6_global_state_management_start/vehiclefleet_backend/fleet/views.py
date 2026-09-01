import time
from datetime import timedelta

from django.db.models import Avg, Count
from django.db.models.functions import TruncWeek
from django.utils import timezone
from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from rest_framework.decorators import action
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
            Trip.objects.filter(start_time__gte=six_months_ago, distance__isnull=False)
            .annotate(week=TruncWeek("start_time"))
            .values("week")
            .annotate(avg_distance=Avg("distance"))
            .order_by("week")
            .values_list("week", "avg_distance")
        )

        return Response(
            {
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
            }
        )


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

    @action(detail=True, methods=["get"])
    def map(self, request, pk=None):
        trip = self.get_object()
        needs_save = False
        geocoded_start = False
        if trip.start_lat is None or trip.start_lng is None:
            geolocator = Nominatim(user_agent="vehiclefleet-app")
            result = geolocator.geocode(trip.start_location)
            if result:
                trip.start_lat = result.latitude
                trip.start_lng = result.longitude
                needs_save = True
            geocoded_start = True

        if trip.end_lat is None or trip.end_lng is None:
            if geocoded_start:
                time.sleep(1)  # Nominatim rate limit: max 1 request/second
            geolocator = Nominatim(user_agent="vehiclefleet-app")
            result = geolocator.geocode(trip.end_location)
            if result:
                trip.end_lat = result.latitude
                trip.end_lng = result.longitude
                needs_save = True

        if needs_save:
            start = (float(trip.start_lat), float(trip.start_lng))
            end = (float(trip.end_lat), float(trip.end_lng))
            trip.distance = round(geodesic(start, end).km, 2)
            trip.save(
                update_fields=[
                    "start_lat",
                    "start_lng",
                    "end_lat",
                    "end_lng",
                    "distance",
                ]
            )

        serializer = self.get_serializer(trip)

        return Response(
            {
                **serializer.data,
                "start_coordinates": (
                    {
                        "lat": float(trip.start_lat),
                        "lng": float(trip.start_lng),
                    }
                    if trip.start_lat is not None
                    else None
                ),
                "end_coordinates": (
                    {
                        "lat": float(trip.end_lat),
                        "lng": float(trip.end_lng),
                    }
                    if trip.end_lat is not None
                    else None
                ),
            }
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        trip = self.get_object()
        trip.status = Trip.STATUS_IN_PROGRESS
        trip.save(update_fields=["status"])
        return Response(self.get_serializer(trip).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        trip = self.get_object()
        trip.status = Trip.STATUS_COMPLETED
        trip.end_time = timezone.now()
        trip.save(update_fields=["status", "end_time"])
        return Response(self.get_serializer(trip).data)
