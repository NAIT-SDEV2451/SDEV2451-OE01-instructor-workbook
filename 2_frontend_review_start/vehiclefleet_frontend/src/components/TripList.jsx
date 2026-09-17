import { Link } from "react-router-dom";

function TripList({ trips }) {    
    return (
       <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Vehicle Detail</th>
                        <th>Driver Detail</th>
                        <th>Start Time</th>
                        <th>Distance</th>
                    </tr>
                </thead>
                <tbody>
                    {trips.map((trip) => (
                        <tr key={trip.id}>
                            <td><Link to={`/trips/${trip.id}`}>{trip.id}</Link></td>
                            <td>{trip.vehicle_detail.make} {trip.vehicle_detail.model}</td>
                            <td>{trip.driver_detail.name}</td>
                            <td>{new Date(trip.start_time).toLocaleString()}</td>
                            <td>
                                {trip.distance ?? (
                                    <span className="badge badge-warning badge-sm">In Progress</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
       </div> 
    )
}

export default TripList;