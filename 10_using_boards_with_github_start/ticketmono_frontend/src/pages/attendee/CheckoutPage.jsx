import { useCart } from '../../hooks/useCart'
import { useCreateOrder } from '../../hooks/useCreateOrder'

function CheckoutPage() {
  const { items } = useCart()
  const cartItems = Object.values(items)
  const grandTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.tierPrice),
    0
  )
  const { mutate, isPending, isSuccess } = useCreateOrder()

  function handlePlaceOrder() {
    const orderItems = cartItems.map((item) => ({
      event_id: item.eventId,
      ticket_tier_id: item.tierId,
      quantity: item.quantity,
    }))
    mutate(orderItems)
  }

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Order Placed!</h1>
        <p className="text-base-content/60">Thank you for your order.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      {cartItems.length === 0 ? (
        <p className="text-base-content/60">Your cart is empty.</p>
      ) : (
        <div>
          {cartItems.map((item) => (
            <div
              key={`${item.eventId}-${item.tierId}`}
              className="flex justify-between py-3 border-b border-base-300"
            >
              <div>
                <p className="font-semibold">{item.eventName}</p>
                <p className="text-sm text-base-content/60">
                  {item.tierName} × {item.quantity}
                </p>
              </div>
              <p className="font-medium">
                ${(item.quantity * parseFloat(item.tierPrice)).toFixed(2)}
              </p>
            </div>
          ))}
          <div className="flex justify-between pt-4 font-bold text-lg">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
          <div className="mt-6">
            <button
              className="btn btn-primary w-full"
              onClick={handlePlaceOrder}
              disabled={isPending}
            >
              {isPending ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckoutPage
