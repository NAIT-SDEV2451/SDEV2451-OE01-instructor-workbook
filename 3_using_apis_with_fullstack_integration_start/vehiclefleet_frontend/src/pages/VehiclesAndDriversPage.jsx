import VehicleList from '../components/VehicleList'
import DriverList from '../components/DriverList'
import { VEHICLES, DRIVERS } from '../mockData'

function VehiclesAndDriversPage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-semibold mb-3">Vehicles</h2>
        <VehicleList vehicles={VEHICLES} />
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Drivers</h2>
        <DriverList drivers={DRIVERS} />
      </section>
    </div>
  )
}

export default VehiclesAndDriversPage
