function StatCard({ label, value, color }) {
  return (
    <div className={`card shadow-md ${color}`}>
      <div className="card-body">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="text-4xl font-bold">
          {value ?? <span className="loading loading-spinner loading-sm" />}
        </p>
      </div>
    </div>
  )
}

export default StatCard
