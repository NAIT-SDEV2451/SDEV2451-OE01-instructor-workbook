import { createContext, useState } from 'react'

export const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, updateCartItems] = useState({})

  function updateCart({ eventId, eventName, tierId, tierName, tierPrice, quantity }) {
    const key = `${eventId}-${tierId}`
    updateCartItems((prev) => {
      if (quantity === 0) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: { eventId, eventName, tierId, tierName, tierPrice, quantity } }
    })
  }

  const value = {
    items,
    updateCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
