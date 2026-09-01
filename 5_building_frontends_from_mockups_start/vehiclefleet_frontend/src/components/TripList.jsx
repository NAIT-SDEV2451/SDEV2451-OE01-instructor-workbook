function TripList({ trips }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>#</th>
            <th>Vehicle</th>
            <th>Driver</th>
            <th>From</th>
            <th>To</th>
            <th>Start Time</th>
            <th>Distance (km)</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id}>
              <td>{trip.id}</td>
              <td>{trip.vehicle_detail.make} {trip.vehicle_detail.model}</td>
              <td>{trip.driver_detail.name}</td>
              <td>{trip.start_location}</td>
              <td>{trip.end_location}</td>
              <td>{new Date(trip.start_time).toLocaleString()}</td>
              <td>
                {trip.distance ?? (
                  <span className="badge badge-warning badge-sm">In progress</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TripList
