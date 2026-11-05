import { useParams, Link } from 'react-router-dom'
import EventDetailsHeader from '../../components/EventDetailsHeader'
import TicketTierList from '../../components/TicketTierList'
import { useEvent } from '../../hooks/useEvent'
import { useCart } from '../../hooks/useCart'

function EventDetailPage() {
  const { id } = useParams()
  const { data: event, isLoading, isError } = useEvent(id)
  const { items } = useCart()

  const hasItems = Object.keys(items).length > 0

  if (isLoading) {
    return (
      <div className="flex justify-center mt-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Failed to load event. Please try again later.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <EventDetailsHeader event={event} />
      <TicketTierList tiers={event.ticket_tiers} eventId={event.id} eventName={event.name} />
      {hasItems && (
        <div className="mt-6">
          <Link to="/checkout" className="btn btn-primary w-full">
            Go to Checkout
          </Link>
        </div>
      )}
    </div>
  )
}

export default EventDetailPage
