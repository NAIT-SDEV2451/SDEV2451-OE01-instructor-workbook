import apiClient from './client'

export async function createOrder(items) {
  const res = await apiClient('/orders/', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error('Failed to create order.')
  return res.json()
}

