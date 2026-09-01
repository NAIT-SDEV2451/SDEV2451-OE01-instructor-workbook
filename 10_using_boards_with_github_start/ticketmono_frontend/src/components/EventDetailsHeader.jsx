function EventDetailsHeader({ event }) {
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
    <div className="bg-base-100 shadow rounded-box p-6 mb-6">
      <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
      <p className="text-base-content/60 mb-4">{formattedDate} · {formattedTime}</p>
      <div>
        <p className="font-semibold">{event.venue.name}</p>
        <p className="text-sm text-base-content/60">{event.venue.address}</p>
      </div>
    </div>
  )
}

export default EventDetailsHeader
