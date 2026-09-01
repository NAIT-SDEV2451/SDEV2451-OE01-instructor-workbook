import { useState } from 'react'
import { useCart } from '../hooks/useCart'

function TicketTierSelector({ tier, eventId, eventName }) {
  const [quantity, setQuantity] = useState(0)
  const { updateCart } = useCart()

  function decrement() {
    const newQty = Math.max(0, quantity - 1)
    setQuantity(newQty)
    updateCart({ eventId, eventName, tierId: tier.id, tierName: tier.name, tierPrice: tier.price, quantity: newQty })
  }

  function increment() {
    const newQty = quantity + 1
    setQuantity(newQty)
    updateCart({ eventId, eventName, tierId: tier.id, tierName: tier.name, tierPrice: tier.price, quantity: newQty })
  }

  return (
    <div className="flex items-center justify-between p-4 bg-base-100 rounded-box shadow">
      <div>
        <p className="font-semibold">{tier.name}</p>
        <p className="text-sm text-base-content/60">${tier.price}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-sm btn-outline" onClick={decrement}>−</button>
        <span className="w-6 text-center font-medium">{quantity}</span>
        <button className="btn btn-sm btn-outline" onClick={increment}>+</button>
      </div>
    </div>
  )
}

export default TicketTierSelector
