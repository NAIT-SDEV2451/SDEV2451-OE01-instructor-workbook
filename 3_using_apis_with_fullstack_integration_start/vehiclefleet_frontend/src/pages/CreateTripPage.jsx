import { useNavigate } from 'react-router-dom'
import TripForm from '../components/TripForm'
import { VEHICLES, DRIVERS } from '../mockData'

function CreateTripPage() {
  const navigate = useNavigate()

  function handleSubmit(formData) {
    // In a real app: POST to /api/v1/trips/ then navigate
    console.log('New trip submitted:', formData)
    navigate('/trips')
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Create a New Trip</h2>
      <TripForm vehicles={VEHICLES} drivers={DRIVERS} onSubmit={handleSubmit} />
    </div>
  )
}

export default CreateTripPage
