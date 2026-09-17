from django_filters.rest_framework import DateTimeFilter, FilterSet, NumberFilter

from fleet.models import Trip


class TripFilter(FilterSet):
    vehicle = NumberFilter(field_name="vehicle")
    driver = NumberFilter(field_name="driver")
    start_time__gte = DateTimeFilter(field_name="start_time", lookup_expr="gte")
    start_time__lte = DateTimeFilter(field_name="start_time", lookup_expr="lte")

    class Meta:
        model = Trip
        fields = ["vehicle", "driver", "start_time__gte", "start_time__lte"]