import { Link } from 'react-router-dom'

function EventCard({ event }) {
  const date = new Date(event.date_time)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">{event.name}</h2>
        <p className="text-sm text-base-content/60">{formattedDate} · {formattedTime}</p>
        <p className="text-sm">{event.venue.name}</p>
        <p className="text-sm text-base-content/60">{event.venue.address}</p>
        <div className="card-actions justify-end mt-2">
          <Link to={`/events/${event.id}`} className="btn btn-primary btn-sm">
            Get Tickets
          </Link>
        </div>
      </div>
    </div>
  )
}

export default EventCard
