import { useNavigate } from 'react-router-dom'
import TripForm from '../components/TripForm'
import { useDrivers } from '../hooks/useDrivers'
import { useVehicles } from '../hooks/useVehicles'
import { useCreateTrip } from '../hooks/useTrips'

function CreateTripPage() {
  const { drivers } = useDrivers()
  const { vehicles } = useVehicles()
  const { mutate: createTrip, isPending } = useCreateTrip()

  const navigate = useNavigate()

  function handleSubmit(formData) {
    // In a real app: POST to /api/v1/trips/ then navigate
    console.log('New trip submitted:', formData)
    createTrip(formData, {
      onSuccess: () => navigate('/trips')
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Create a New Trip</h2>
      {isPending ? (<span className="loading loading-spinner loading-md mb-4"></span>) : null}
      <TripForm vehicles={vehicles} drivers={drivers} onSubmit={handleSubmit} />
    </div>
  )
}

export default CreateTripPage
