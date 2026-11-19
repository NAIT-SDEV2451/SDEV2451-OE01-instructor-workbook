import apiClient from './client'

export async function fetchEvents() {
  const res = await apiClient('/events/')
  if (!res.ok) throw new Error('Failed to fetch events.')
  return res.json()
}

export async function fetchEvent(id) {
  const res = await apiClient(`/events/${id}/`)
  if (!res.ok) throw new Error('Failed to fetch event.')
  return res.json()
}
