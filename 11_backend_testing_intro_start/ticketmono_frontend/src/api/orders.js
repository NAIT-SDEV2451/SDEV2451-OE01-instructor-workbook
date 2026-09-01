import apiClient from './client'

export async function createOrder(items) {
  const res = await apiClient('/orders/', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error('Failed to create order.')
  return res.json()
}

export async function fetchOrder(id) {
  const res = await apiClient(`/orders/${id}/`)
  if (!res.ok) throw new Error('Failed to fetch order.')
  return res.json()
}
