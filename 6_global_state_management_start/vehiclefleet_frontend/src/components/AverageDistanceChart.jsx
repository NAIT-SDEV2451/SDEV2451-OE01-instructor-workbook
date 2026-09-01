import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

function formatWeek(isoDate) {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-CA', { month: 'short', day: '2-digit' })
}

function AverageDistanceChart({ data }) {
  const chartData = data.map((entry) => ({
    week: formatWeek(entry.week),
    avg_distance: entry.avg_distance,
  }))

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h3 className="card-title text-base">Average Trip Distance per Week</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis unit=" km" width={70} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value} km`, 'Avg Distance']} />
            <Bar dataKey="avg_distance" fill="#570df8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default AverageDistanceChart
