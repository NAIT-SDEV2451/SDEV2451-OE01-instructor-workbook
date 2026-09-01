from rest_framework import serializers
from fleet.models import Driver, Trip, Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = "__all__"


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = "__all__"


class TripSerializer(serializers.ModelSerializer):
    # Nested detail on reads
    vehicle_detail = VehicleSerializer(source="vehicle", read_only=True)
    driver_detail = DriverSerializer(source="driver", read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "vehicle",
            "vehicle_detail",
            "driver",
            "driver_detail",
            "start_location",
            "end_location",
            "start_time",
            "end_time",
            "distance",
        ]
        extra_kwargs = {
            "vehicle": {"write_only": True},
            "driver": {"write_only": True},
        }
