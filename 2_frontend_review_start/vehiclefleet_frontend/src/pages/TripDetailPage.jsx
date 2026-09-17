import { useParams } from "react-router-dom"
import { TRIPS } from '../mockData'


function TripDetailPage() {
    const { id } = useParams();

    const trip = TRIPS.find((trip) => trip.id === Number(id))

    return (
        <div className="card bg-base-100 w-full shadow">
            <pre>
                {JSON.stringify(trip, null, 2)}
            </pre>
        </div>
    )
}

export default TripDetailPage;