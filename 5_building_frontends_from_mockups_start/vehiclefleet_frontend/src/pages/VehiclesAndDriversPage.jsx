import { useState, useEffect } from 'react'
import VehicleList from '../components/VehicleList'
import DriverList from '../components/DriverList'
import { useVehicles } from '../hooks/useVehicles'
import { useDrivers } from '../hooks/useDrivers'

function VehiclesAndDriversPage() {
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [driverSearch, setDriverSearch] = useState('')

  const { vehicles, isLoading: loadingVehicles, invalidate: invalidateVehicles } = useVehicles(vehicleSearch)
  const { drivers, isLoading: loadingDrivers, invalidate: invalidateDrivers } = useDrivers(driverSearch)

  useEffect(() => {
    invalidateVehicles()
  }, [vehicleSearch])

  useEffect(() => {
    invalidateDrivers()
  }, [driverSearch])

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-semibold mb-3">Vehicles</h2>
        <input
          type="text"
          placeholder="Search by make, model, or plate..."
          value={vehicleSearch}
          onChange={(e) => setVehicleSearch(e.target.value)}
          className="input input-bordered w-full max-w-sm mb-3"
        />
        {loadingVehicles
          ? <span className="loading loading-spinner loading-md" />
          : <VehicleList vehicles={vehicles} />
        }
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Drivers</h2>
        <input
          type="text"
          placeholder="Search by name, licence, or email..."
          value={driverSearch}
          onChange={(e) => setDriverSearch(e.target.value)}
          className="input input-bordered w-full max-w-sm mb-3"
        />
        {loadingDrivers
          ? <span className="loading loading-spinner loading-md" />
          : <DriverList drivers={drivers} />
        }
      </section>
    </div>
  )
}

export default VehiclesAndDriversPage
