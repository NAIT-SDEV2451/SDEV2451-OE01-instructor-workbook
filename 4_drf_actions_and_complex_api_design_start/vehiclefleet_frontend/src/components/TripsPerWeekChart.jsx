import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { formatWeek } from "../utils/dateUtils"

function TripsPerWeekChart({ data = []}) {
    const chartData = data.map((entry) => ({
        week: formatWeek(entry.week),
        total_trips: entry.total_trips,
    }))

    return (
        <div className="card bg-base-100 shadow-md">
            <div className="card-body">
                <h3 className="card-title text-base">
                    Trips Per Week
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }}/> 
                        <YAxis unit=" trip(s)" allowDecimals={false} width={70} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => [value, 'Trips']} />
                        <Line 
                            type="monotone"
                            dataKey="total_trips"
                            stroke="#570df8"
                            strokeWidth={2}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export default TripsPerWeekChart