import { useParams } from 'react-router-dom'

const mockOrder = {
    id: 1,
    tickets: [
        { id: 1, eventName: 'Summer Music Festival', tierName: 'General Admission', quantity: 2 },
        { id: 2, eventName: 'Summer Music Festival', tierName: 'VIP', quantity: 1 },
    ],
}

function OrderConfirmationPage() {
    const { id } = useParams()

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">
                    Order Confirmed
                </h1>
                <p className="text-base-content/60">
                    Order #{mockOrder.id}
                </p>
            </div>

            <div className="card bg-base-100 shadow">
                <div className="card-body">
                    <h2 className="card-title text-lg mb-4">Your Tickets</h2>
                    {
                        mockOrder.tickets.map((ticket) => (
                            <div
                                key={ticket.id} 
                                className="flex justify-between items-center py-3 border-b border-base-300 last:border-0">
                                    <div>
                                        <p className="font-semibold">{ticket.eventName}</p>
                                        <p className="text-sm text-base-content/60">
                                            {ticket.tierName} x {ticket.quantity}
                                        </p>
                                    </div>
                            </div>
                        ))

                    }
                </div>
            </div>
        </div>
    )
}

export default OrderConfirmationPage