import { Link } from 'react-router-dom'
import { eventToString } from '../utils/DateUtils'

function EventCard({ event }) {
    const [formattedDate, formattedTime] = eventToString(event.date_time)

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body">
                <h2 className="card-title">{event.name}</h2>
                <p className="text-sm text-base-content/60">{formattedDate} &bull; {formattedTime}</p>
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