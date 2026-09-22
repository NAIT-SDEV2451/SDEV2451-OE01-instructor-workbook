import VehicleList from '../components/VehicleList'
import DriverList from '../components/DriverList'
import { useVehicles } from '../hooks/useVehicles'
import { useDrivers } from '../hooks/useDrivers'


function VehiclesAndDriversPage() {
  const { vehicles, isLoading: isVehicleLoading } = useVehicles();
  const { drivers, isLoading: isDriverLoading } = useDrivers();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-semibold mb-3">Vehicles</h2>
        {isVehicleLoading ? (<span className="loading loading-spinner loading-md"></span>) : (<VehicleList vehicles={vehicles} />) }
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Drivers</h2>
        {isDriverLoading ? (<span className="loading loading-spinner loading-md"></span>) : (<DriverList drivers={drivers} />) }
      
      </section>
    </div>
  )
}

export default VehiclesAndDriversPage
