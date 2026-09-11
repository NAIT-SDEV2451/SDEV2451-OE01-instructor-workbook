from django.utils import timezone
from rest_framework.views import APIView, status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import SearchFilter
from rest_framework.decorators import action

from fleet.filters import TripFilter
from fleet.models import Vehicle, Driver, Trip
from fleet.serializers import (
    VehicleSerializer,
    DriverSerializer,
    TripSerializer,
    TripCompletionSerializer,
)

class FleetStatsView(APIView):
    def get(self, request):
        return Response({
            "total_vehicles": Vehicle.objects.count(),
            "total_drivers": Driver.objects.count(),
            "total_trips": Trip.objects.count(),
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
    filterset_class = TripFilter

    def get_queryset(self):
        return Trip.objects.select_related("vehicle", "driver").all()

    @action(detail=True, methods=["patch"])
    def complete(self, request, pk=None):
        trip = self.get_object()
        completion_serializer = TripCompletionSerializer(data=request.data)
        if completion_serializer.is_valid():
            trip.distance = completion_serializer.validated_data["distance"]
            trip.end_time = timezone.now()
            trip.save(update_fields=["distance", "end_time"])

            return Response(self.get_serializer(trip).data)
        else:
            return Response(completion_serializer.errors, status=status.HTTP_400_BAD_REQUEST)