import { useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import TripMap from '../components/TripMap'
import TripInfo from '../components/TripInfo'
import { useTripDetails } from '../hooks/useTripDetails'

const STATUS_BADGE = {
  pending: 'badge-ghost',
  in_progress: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-error',
}

const STATUS_LABEL = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
}

function TripDetailPage() {
  const { id } = useParams()
  const { trip, isLoading, isError, startTrip, completeTrip } = useTripDetails(id)

  if (isLoading) return <span className="loading loading-spinner loading-lg" />
  if (isError || !trip) return <p className="text-error">Trip not found.</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackButton to="/trips" label="Back to Trips" />
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Trip #{trip.id}</h1>
          <span className={`badge ${STATUS_BADGE[trip.status] ?? 'badge-ghost'}`}>
            {STATUS_LABEL[trip.status] ?? trip.status}
          </span>
        </div>
      </div>

      <TripMap
        startLocation={trip.start_location}
        endLocation={trip.end_location}
        startCoordinates={trip.start_coordinates}
        endCoordinates={trip.end_coordinates}
      />

      <div className="flex flex-wrap gap-2">
        {trip.status === 'pending' && (
          <button
            className="btn btn-primary"
            onClick={() => startTrip.mutate()}
            disabled={startTrip.isPending}
          >
            {startTrip.isPending
              ? <span className="loading loading-spinner loading-sm" />
              : 'Start Trip'
            }
          </button>
        )}
        {trip.status === 'in_progress' && (
          <>
            <button
              className="btn btn-outline"
              onClick={() => completeTrip.mutate()}
              disabled={completeTrip.isPending}
            >
              {completeTrip.isPending
                ? <span className="loading loading-spinner loading-sm" />
                : 'Complete Trip'
              }
            </button>
            <button className="btn btn-outline btn-error">Can't Be Delivered</button>
          </>
        )}
      </div>

      <TripInfo trip={trip} />
    </div>
  )
}

export default TripDetailPage
