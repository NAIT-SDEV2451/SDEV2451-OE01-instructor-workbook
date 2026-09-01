import TripList from '../components/TripList'
import StatCard from '../components/StatCard'
import AverageDistanceChart from '../components/AverageDistanceChart'
import { useTrips } from '../hooks/useTrips'
import { useStats } from '../hooks/useStats'

const STAT_CARDS = [
  { key: 'total_vehicles',   label: 'Total Vehicles',       color: 'bg-primary text-primary-content' },
  { key: 'total_drivers',    label: 'Total Drivers',        color: 'bg-secondary text-secondary-content' },
  { key: 'total_trips',      label: 'Total Trips',          color: 'bg-accent text-accent-content' },
  { key: 'avg_trip_distance', label: 'Average Trip Distance', color: 'bg-neutral text-neutral-content' },
]

function TripsPage() {
  const { trips, isLoading } = useTrips()
  const { stats } = useStats()

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, color }) => (
          <StatCard key={key} label={label} value={stats?.[key]} color={color} />
        ))}
      </div>

      {stats?.avg_distance_per_week?.length > 0 && (
        <AverageDistanceChart data={stats.avg_distance_per_week} />
      )}

      <div>
        <h2 className="text-xl font-semibold mb-3">Trips</h2>
        {isLoading
          ? <span className="loading loading-spinner loading-md" />
          : <TripList trips={trips} />
        }
      </div>
    </div>
  )
}

export default TripsPage
