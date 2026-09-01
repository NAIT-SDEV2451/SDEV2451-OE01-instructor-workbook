import TripCard from './TripCard'

function TripInfo({ trip }) {
  const { vehicle_detail, driver_detail, start_location, end_location, start_time, distance } = trip

  const startFormatted = new Date(start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <TripCard
        label="Vehicle"
        title={vehicle_detail.license_plate}
        subtitle={`${vehicle_detail.make} ${vehicle_detail.model} · ${vehicle_detail.year}`}
      />
      <TripCard
        label="Driver"
        title={driver_detail.name}
        subtitle={`License ${driver_detail.license_number}`}
      />
      <TripCard
        label="Route"
        title={`${start_location} → ${end_location}`}
        subtitle={`${distance ? `${distance} km` : 'In progress'} · started ${startFormatted}`}
      />
    </div>
  )
}

export default TripInfo
