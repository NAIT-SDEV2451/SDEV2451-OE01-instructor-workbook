# Django REST Framework Review — Fleet Management API

This example is a vehicle fleet management to review all of the core concepts of the previous course on backend development.

## Prerequisites
- Create a new virtual environment and install the packages from the `requirements.txt` file.
- Run `python manage.py migrate` after completing Step 2 to apply all model migrations.

## Steps

We have already learned how to create Django models and write basic views. This example reviews the core building blocks of Django REST Framework: serializers, `APIView`, `ModelViewSet`, routers, and search filtering — all in a single focused project with no frontend.

We will build a Fleet Management API with three models (`Vehicle`, `Driver`, `Trip`) and cover every major DRF concept from ViewSets through nested serialization.

---

### 1. Configure settings and project URLs in `vehiclefleet_backend/settings.py` and `vehiclefleet_backend/urls.py`

Before writing any app code we register DRF and wire up the project URLs so Django knows where to route API requests.

```python
# vehiclefleet_backend/settings.py

INSTALLED_APPS = [
    # ... django built-ins ...
    "rest_framework",
    # custom apps
    "fleet",
]

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}
```

```python
# vehiclefleet_backend/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("fleet.urls")),
]
```

Let's talk about what this code is doing.
- Adding `"rest_framework"` to `INSTALLED_APPS` activates DRF's browsable API, its view classes, and all of its settings.
- `DEFAULT_PERMISSION_CLASSES` sets the global permission policy. `AllowAny` means every endpoint is publicly accessible — no login required. This is appropriate for a review example where the focus is on the API structure, not access control.
- `path("api/v1/", include("fleet.urls"))` delegates all URLs that start with `api/v1/` to the fleet app's own URL file, which we will create in Step 5.

---

### 2. Create the models in `fleet/models.py`

The three domain models mirror a real fleet: vehicles, the drivers assigned to them, and individual trips that link a driver to a vehicle.

```python
# fleet/models.py

from django.db import models


class Vehicle(models.Model):
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    license_plate = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.year} {self.make} {self.model} ({self.license_plate})"


class Driver(models.Model):
    name = models.CharField(max_length=150)
    license_number = models.CharField(max_length=50, unique=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)

    def __str__(self):
        return f"{self.name} ({self.license_number})"


class Trip(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="trips")
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="trips")
    start_location = models.CharField(max_length=255)
    end_location = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    distance = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
```

Let's talk about what this code is doing.
- `unique=True` on `license_plate` and `license_number` enforces that no two vehicles or drivers can share the same identifier — the database raises an integrity error if a duplicate is attempted.
- `ForeignKey` with `on_delete=models.CASCADE` means that if a `Vehicle` is deleted, all its related `Trip` records are deleted too. Choose `PROTECT` instead if you want to prevent deletion of a vehicle that has trips.
- `related_name="trips"` on both ForeignKeys means you can traverse the relationship with `vehicle.trips.all()` or `driver.trips.all()`.
- `null=True, blank=True` on `end_time` and `distance` allows trips to be created before they are completed — you can update these fields once the trip finishes.

After writing the models, run:
```bash
python manage.py makemigrations
python manage.py migrate
```

#### 2b. Load sample fixtures into `fleet/fixtures/`

Fixtures give us pre-built sample data so we can test the API immediately without manually creating objects through Postman or the admin panel.

The project includes three fixture files in `fleet/fixtures/`:

| File            | Records                                                            |
| --------------- | ------------------------------------------------------------------ |
| `vehicles.json` | 3 vehicles (Ford Transit, Toyota HiAce, Mercedes Sprinter)         |
| `drivers.json`  | 3 drivers (Jane Smith, Bob Johnson, Maria Garcia)                  |
| `trips.json`    | 5 trips — 4 completed, 1 in-progress (no `end_time` or `distance`) |

Load them in order — vehicles and drivers first because trips reference their primary keys:

```bash
python manage.py loaddata vehicles drivers trips
```

Expected output:
```
Installed 11 object(s) from 3 fixture(s)
```

Let's talk about what this code is doing.
- Django's `loaddata` command reads JSON fixture files from any `fixtures/` directory inside a registered app and inserts the records into the database.
- The order of arguments matters when there are foreign key dependencies. `trips` must come after `vehicles` and `drivers` because each `Trip` references a `Vehicle` pk and a `Driver` pk.
- Each fixture object uses `"model": "fleet.vehicle"` to tell Django which model table to insert into, and `"pk"` to set the primary key explicitly — this keeps the IDs predictable and consistent across reloads.
- Trip 5 has `"end_time": null` and `"distance": null` to simulate an in-progress trip. This is valid because those fields are defined with `null=True, blank=True` on the model.

> **Note:** Running `loaddata` twice on the same database will fail with a unique constraint error because the PKs already exist. Either flush the database first with `python manage.py flush` or use a fresh database.

---

### 3. Create serializers in `fleet/serializers.py`

Serializers convert model instances to JSON for API responses and validate incoming JSON before saving to the database.

```python
# fleet/serializers.py

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
```

Let's talk about what this code is doing.
- `fields = "__all__"` on `VehicleSerializer` and `DriverSerializer` exposes every model field — fine for simple models with no sensitive data.
- `vehicle_detail = VehicleSerializer(source="vehicle", read_only=True)` nests the full vehicle object inside the trip response. The `source` argument tells DRF which model attribute to use as the data source.
- `driver_detail` works the same way, giving clients full driver information without a second API call.
- `"vehicle": {"write_only": True}` hides the raw foreign key integer from read responses while still accepting it when creating or updating a trip. The client sends `{"vehicle": 1}` to write, and receives `{"vehicle_detail": {...}}` to read.
- This write-FK / read-nested pattern keeps the API clean: simple integers in, rich objects out.

---

### 4. Create views in `fleet/views.py`

This file shows two DRF view patterns side by side: a hand-written `APIView` for custom logic, and `ModelViewSet` for standard CRUD on each model.

#### 4a. Add `FleetStatsView` — an `APIView` example

```python
# fleet/views.py

from django.db.models import Count
from rest_framework.filters import SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from fleet.models import Driver, Trip, Vehicle
from fleet.serializers import DriverSerializer, TripSerializer, VehicleSerializer


class FleetStatsView(APIView):

    def get(self, request):
        return Response({
            "total_vehicles": Vehicle.objects.count(),
            "total_drivers": Driver.objects.count(),
            "total_trips": Trip.objects.count(),
        })
```

Let's talk about what this code is doing.
- `APIView` is the lowest-level DRF view class. You define each HTTP method (`get`, `post`, `put`, etc.) as a Python method on the class. DRF routes the incoming request to the right method automatically.
- Because `AllowAny` is the global default set in `settings.py`, no `permission_classes` override is needed here — the endpoint is open to everyone by default.
- `Response({...})` serializes the dictionary to JSON and returns it with a `200 OK` status automatically.

#### 4b. Add `VehicleViewSet` and `DriverViewSet`

```python
# fleet/views.py
# ... other code ...

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
```

Let's talk about what this code is doing.
- `ModelViewSet` automatically provides `list`, `create`, `retrieve`, `update`, `partial_update`, and `destroy` actions. Setting `queryset` and `serializer_class` is all that is required for a fully functional CRUD API.
- `filter_backends = [SearchFilter]` adds a `?search=` query parameter to the list action. DRF performs a case-insensitive `icontains` check across every field listed in `search_fields`.
- A request like `GET /api/v1/vehicles/?search=ford` returns every vehicle where `make`, `model`, or `license_plate` contains "ford".

#### 4c. Add `TripViewSet`

```python
# fleet/views.py
# ... other code ...

class TripViewSet(ModelViewSet):
    serializer_class = TripSerializer

    def get_queryset(self):
        return Trip.objects.select_related("vehicle", "driver").all()
```

Let's talk about what this code is doing.
- `TripViewSet` uses `get_queryset()` instead of a static `queryset` attribute because we need to call `select_related`.
- `select_related("vehicle", "driver")` tells Django to fetch the related `Vehicle` and `Driver` rows in a single SQL `JOIN` rather than issuing a separate query per trip. Without it, listing 20 trips would fire 41 queries (1 list + 20 vehicle + 20 driver). This is the **N+1 problem**.

---

### 5. Wire up the Router in `fleet/urls.py`

The `DefaultRouter` turns our three ViewSets into a full set of URL patterns with a single `register` call each.

```python
# fleet/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from fleet.views import DriverViewSet, FleetStatsView, TripViewSet, VehicleViewSet

router = DefaultRouter()
router.register("vehicles", VehicleViewSet, basename="vehicle")
router.register("drivers", DriverViewSet, basename="driver")
router.register("trips", TripViewSet, basename="trip")

urlpatterns = [
    path("stats/", FleetStatsView.as_view(), name="fleet-stats"),
    path("", include(router.urls)),
]
```

Let's talk about what this code is doing.
- `DefaultRouter` generates two URL patterns per registered ViewSet: a list endpoint (`/api/v1/vehicles/`) and a detail endpoint (`/api/v1/vehicles/{id}/`). It also adds a browsable API root at `/api/v1/`.
- `basename="vehicle"` is used to name the generated URL patterns (`vehicle-list`, `vehicle-detail`). It is required when using `get_queryset()` instead of a static `queryset` attribute — the router cannot infer the name on its own.
- The `stats/` path is registered manually before `include(router.urls)` because it is not a ViewSet action — it is a standalone `APIView`.

---

### 6. Test the API with Postman

Run the server first:
```bash
python manage.py runserver
```

#### 6a. Set up a Postman Collection

1. Open Postman and click **New → Collection**. Name it `Fleet Management API`.
2. All requests in this example are open — no authentication headers are needed.

#### 6b. Create a vehicle

| Field    | Value                                    |
| -------- | ---------------------------------------- |
| Method   | `POST`                                   |
| URL      | `http://localhost:8000/api/v1/vehicles/` |
| Body tab | `raw` → `JSON`                           |

Body:
```json
{
    "make": "Ford",
    "model": "Transit",
    "year": 2022,
    "license_plate": "GHI-3456"
}
```

Expected response — `201 Created`. Note the `id` in the response for use in the trip step.

#### 6c. Create a driver

| Field    | Value                                   |
| -------- | --------------------------------------- |
| Method   | `POST`                                  |
| URL      | `http://localhost:8000/api/v1/drivers/` |
| Body tab | `raw` → `JSON`                          |

Body:
```json
{
    "name": "Carlos Rivera",
    "license_number": "DL-11223",
    "phone": "555-0400",
    "email": "carlos@example.com"
}
```

#### 6d. Create a trip

| Field    | Value                                  |
| -------- | -------------------------------------- |
| Method   | `POST`                                 |
| URL      | `http://localhost:8000/api/v1/trips/`  |
| Body tab | `raw` → `JSON`                         |

Body (replace `4` with the actual `vehicle` and `driver` IDs from previous responses):
```json
{
    "vehicle": 4,
    "driver": 4,
    "start_location": "East Depot",
    "end_location": "West Terminal",
    "start_time": "2026-06-02T09:00:00Z"
}
```

Expected response — `201 Created`. Notice the response includes both the writable FK integers (`"vehicle": 4`) and the nested detail objects (`"vehicle_detail": {...}`, `"driver_detail": {...}`).

#### 6e. List all trips

| Field  | Value                                 |
| ------ | ------------------------------------- |
| Method | `GET`                                 |
| URL    | `http://localhost:8000/api/v1/trips/` |

The nested vehicle and driver data is returned inside each trip.

#### 6f. Search vehicles

| Field     | Value                                              |
| --------- | -------------------------------------------------- |
| Method    | `GET`                                              |
| URL       | `http://localhost:8000/api/v1/vehicles/`           |
| Params tab | `search` = `ford`                                 |

Expected: only vehicles where make, model, or license plate contains "ford".

#### 6g. Search drivers

| Field      | Value                                    |
| ---------- | ---------------------------------------- |
| Method     | `GET`                                    |
| URL        | `http://localhost:8000/api/v1/drivers/`  |
| Params tab | `search` = `jane`                        |

#### 6h. Get fleet stats

| Field  | Value                                 |
| ------ | ------------------------------------- |
| Method | `GET`                                 |
| URL    | `http://localhost:8000/api/v1/stats/` |

Expected response:
```json
{
    "total_vehicles": 4,
    "total_drivers": 4,
    "total_trips": 6
}
```

Let's talk about what we are observing here.
- Every endpoint is open — no `Authorization` header is ever needed. This is because `DEFAULT_PERMISSION_CLASSES` is set to `AllowAny` in `settings.py`.
- The nested `vehicle_detail` and `driver_detail` fields in the trip response appear because `TripSerializer` declares them as `read_only=True` — the client never sends them, but always receives them.
- The search endpoints use the `?search=` query parameter. Postman's **Params tab** appends it to the URL automatically — no manual query string typing needed.

---

## Challenge/Exercise

### 1. Add trip filtering by vehicle and driver

- Add `django-filter` to your project and configure `DEFAULT_FILTER_BACKENDS` in `REST_FRAMEWORK` settings.
- Create a `TripFilter(FilterSet)` in a new `fleet/filters.py` file that allows filtering trips by `vehicle`, `driver`, and `start_time` (date range using `start_time__gte` and `start_time__lte`).
- Apply the filter to `TripViewSet` using `filterset_class = TripFilter`.
- Test in Postman using `?vehicle=1` and `?start_time__gte=2026-06-01T00:00:00Z` as query parameters.

### 2. Add a "complete trip" endpoint

- Add a custom `@action(detail=True, methods=["patch"])` called `complete` to `TripViewSet`.
- The action should set `end_time` to the current time and accept `distance` as a required field in the request body.
- Test the endpoint at `PATCH /api/v1/trips/{id}/complete/` with `{"distance": "45.5"}` in the body.

---

## Conclusion

In this example we learned about:
- **`APIView`** — the base class for hand-written views. Define `get()`, `post()`, etc. as methods. Best for custom endpoints that don't map to a single model.
- **`ModelViewSet`** — generates all six standard actions (`list`, `create`, `retrieve`, `update`, `partial_update`, `destroy`) from just a `queryset` and `serializer_class`.
- **`DefaultRouter`** — registers ViewSets and auto-generates both list and detail URL patterns, plus a browsable API root.
- **`SearchFilter`** — adds `?search=` to any ViewSet with `filter_backends` and `search_fields`. Uses case-insensitive `icontains` across all listed fields. No extra packages required.
- **Nested serializers** — use `NestedSerializer(source="field", read_only=True)` to embed related objects in responses. Pair `write_only=True` on the FK field to keep the write interface simple (integer in, object out).
- **`select_related`** in `get_queryset()` — prevents N+1 SQL queries when serializing related objects. Always use it when a serializer traverses a `ForeignKey` or `OneToOneField`.
- **`DEFAULT_PERMISSION_CLASSES`** — setting this to `AllowAny` in `REST_FRAMEWORK` settings makes all endpoints public by default. This is fine for a learning example but should always be tightened before deploying to production.
- **Caution — `unique=True` fields raise `IntegrityError` on duplicates.** DRF will return a `400 Bad Request` with a clear error message, but make sure your serializer validation catches this before it reaches the database layer.
- **Caution — `loaddata` cannot be run twice on the same database** without flushing first, due to primary key conflicts.
