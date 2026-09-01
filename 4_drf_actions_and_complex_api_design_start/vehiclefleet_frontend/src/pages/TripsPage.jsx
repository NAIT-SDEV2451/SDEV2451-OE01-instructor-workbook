import TripList from '../components/TripList'
import { useTrips } from '../hooks/useTrips'

function TripsPage() {
  const { trips, isLoading } = useTrips()

  return (
    <div>
      <h2 className="text-xl font-semibold mb-3">Trips</h2>
      {isLoading
        ? <span className="loading loading-spinner loading-md" />
        : <TripList trips={trips} />
      }
    </div>
  )
}

export default TripsPage
