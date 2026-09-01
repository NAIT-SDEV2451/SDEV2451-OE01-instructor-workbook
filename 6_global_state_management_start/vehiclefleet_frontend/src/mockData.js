export const VEHICLES = [
  { id: 1, make: "Ford",     model: "Transit",  year: 2022, license_plate: "ABC-1234" },
  { id: 2, make: "Toyota",   model: "HiAce",    year: 2021, license_plate: "XYZ-5678" },
  { id: 3, make: "Mercedes", model: "Sprinter", year: 2020, license_plate: "DEF-9012" },
]

export const DRIVERS = [
  { id: 1, name: "Jane Smith",   license_number: "DL-99887", phone: "555-0100", email: "jane@example.com"  },
  { id: 2, name: "Bob Johnson",  license_number: "DL-44521", phone: "555-0200", email: "bob@example.com"   },
  { id: 3, name: "Maria Garcia", license_number: "DL-77634", phone: "555-0300", email: "maria@example.com" },
]

export const TRIPS = [
  { id: 1, vehicle_detail: VEHICLES[0], driver_detail: DRIVERS[0], start_location: "Warehouse A",        end_location: "Downtown Depot",            start_time: "2026-05-01T08:00:00Z", end_time: "2026-05-01T09:30:00Z", status: "completed",  distance: "45.20" },
  { id: 2, vehicle_detail: VEHICLES[1], driver_detail: DRIVERS[1], start_location: "City Hub",           end_location: "Airport Terminal B",        start_time: "2026-05-02T07:00:00Z", end_time: "2026-05-02T08:15:00Z", status: "completed",  distance: "32.80" },
  { id: 3, vehicle_detail: VEHICLES[2], driver_detail: DRIVERS[2], start_location: "North Yard",         end_location: "South Distribution Centre", start_time: "2026-05-03T06:30:00Z", end_time: "2026-05-03T08:45:00Z", status: "completed",  distance: "78.50" },
  { id: 4, vehicle_detail: VEHICLES[0], driver_detail: DRIVERS[1], start_location: "Downtown Depot",     end_location: "Warehouse B",               start_time: "2026-05-04T10:00:00Z", end_time: "2026-05-04T11:10:00Z", status: "pending",    distance: "28.60" },
  { id: 5, vehicle_detail: VEHICLES[1], driver_detail: DRIVERS[0], start_location: "Airport Terminal B", end_location: "City Hub",                  start_time: "2026-05-05T14:00:00Z", end_time: null,                   status: "in_progress", distance: null   },
]

