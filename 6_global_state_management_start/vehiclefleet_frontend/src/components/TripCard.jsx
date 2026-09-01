function TripCard({ label, title, subtitle }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-50">{label}</p>
        <p className="text-lg font-bold">{title}</p>
        <p className="text-sm opacity-60">{subtitle}</p>
      </div>
    </div>
  )
}

export default TripCard
