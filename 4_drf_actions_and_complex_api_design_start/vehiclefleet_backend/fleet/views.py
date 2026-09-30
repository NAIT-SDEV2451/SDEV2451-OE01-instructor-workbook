from django.db.models import Count, Avg
from django.db.models.functions import TruncWeek
from django.utils import timezone

import time

from geopy.distance import geodesic
from geopy.geocoders import Nominatim
from rest_framework.decorators import action

from datetime import timedelta

from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from fleet.models import Driver, Trip, Vehicle
from fleet.serializers import DriverSerializer, TripSerializer, VehicleSerializer


class FleetStatsView(APIView):

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

        trips_per_week = list(
            Trip.objects
            .filter(start_time__gte=six_months_ago)
            .annotate(week=TruncWeek("start_time"))
            .values("week")
            .annotate(total_trips=Count("id"))
            .order_by("week")
            .values_list("week", "total_trips")
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
            "trips_per_week": [
                {
                    "week": week.strftime("%Y-%m-%d"),
                    "total_trips": total_trips,
                }
                for week, total_trips in trips_per_week
            ],
        })


class VehicleViewSet(ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    filter_backends = [SearchFilter]
    search_fields = ["make", "model", "license_plate"]


class DriverViewSet(ModelViewSet):
    queryset = Driver.objects.all()
    serializer_class = DriverSerializer
    filter_backends = [SearchFilter]
    search_fields = ["name", "license_number", "email"]


class TripViewSet(ModelViewSet):
    serializer_class = TripSerializer

    def get_queryset(self):
        return Trip.objects.select_related("vehicle", "driver").all()

    @action(detail=True, methods=["get"])
    def map(self, request, pk=None):
        trip = self.get_object()
        needs_save = False
        geocoded_start = False
        geolocator = Nominatim(user_agent="vehiclefleet_app")

        if trip.start_lat is None or trip.start_lng is None:
            result = geolocator.geocode(trip.start_location)
            if result:
                trip.start_lat = result.latitude
                trip.start_lng = result.longitude
                needs_save = True
            geocoded_start = True

        if trip.end_lat is None or trip.end_lng in None:
            if geocoded_start:
                time.sleep(1)
            result = geolocator.geocode(trip.end_location)
            if result:
                trip.end_lat = result.latitude
                trip.end_lng = result.longitude
                needs_save = True

        if needs_save:
            start = (float(trip.start_lat), float(trip.start_lng))
            end = (float(trip.end_lat), float(trip.end_lng))
            trip.distance = round(geodesic(start, end).km, 2)
            trip.save(update_fields=["start_lat", "start_lng", "end_lat", "end_lng", "distance"])

        serializer = self.get_serializer(trip)

        return Response({
            **serializer.data,
            "start_coordinates": {
                "lat": float(trip.start_lat),
                "lng": float(trip.start_lng),
            } if trip.start_lat is not None else None,
            "end_coordinates": {
                "lat": float(trip.end_lat),
                "lng": float(trip.end_lng),
            } if trip.end_lat is not None else None,
        })

