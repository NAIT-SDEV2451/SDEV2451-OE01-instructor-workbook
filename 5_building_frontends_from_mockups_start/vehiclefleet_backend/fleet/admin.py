from django.contrib import admin
from fleet.models import Driver, Trip, Vehicle


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ("year", "make", "model", "license_plate")
    search_fields = ("make", "model", "license_plate")


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ("name", "license_number", "phone", "email")
    search_fields = ("name", "license_number")


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("id", "vehicle", "driver", "start_location", "end_location", "start_time")
    list_filter = ("vehicle", "driver")
