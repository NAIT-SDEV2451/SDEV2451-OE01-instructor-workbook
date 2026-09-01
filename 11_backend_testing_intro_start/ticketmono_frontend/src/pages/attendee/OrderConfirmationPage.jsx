import { useParams } from 'react-router-dom'
import { useOrder } from '../../hooks/useOrder'

function OrderConfirmationPage() {
  const { id } = useParams()
  const { data: order, isLoading, isError } = useOrder(id)

  if (isLoading) {
    return <p className="text-center py-8">Loading your order...</p>
  }

  if (isError) {
    return <p className="text-center py-8 text-error">Failed to load order. Please try again.</p>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-base-content/60">Order #{order.id}</p>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Your Tickets</h2>
          {order.tickets.map((ticket) => (
            <div key={ticket.id} className="py-3 border-b border-base-300 last:border-0">
              <p className="font-semibold mb-1">{ticket.tier.event_name}</p>
              <div className="flex justify-between items-center">
                <p className="text-sm text-base-content/60">{ticket.tier.name} × 1</p>
                <p className="font-medium">${parseFloat(ticket.tier.price).toFixed(2)}</p>
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-4 font-bold text-lg">
            <span>Total</span>
            <span>${parseFloat(order.total_price).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmationPage
