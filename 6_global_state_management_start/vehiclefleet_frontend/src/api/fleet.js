const BASE_URL = 'http://localhost:8000/api/v1'

export async function fetchVehicles(search = '') {
  const url = search
    ? `${BASE_URL}/vehicles/?search=${encodeURIComponent(search)}`
    : `${BASE_URL}/vehicles/`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch vehicles')
  return response.json()
}

export async function fetchDrivers(search = '') {
  const url = search
    ? `${BASE_URL}/drivers/?search=${encodeURIComponent(search)}`
    : `${BASE_URL}/drivers/`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch drivers')
  return response.json()
}

export async function fetchTrips() {
  const response = await fetch(`${BASE_URL}/trips/`)
  if (!response.ok) throw new Error('Failed to fetch trips')
  return response.json()
}

export async function fetchStats() {
  const response = await fetch(`${BASE_URL}/stats/`)
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}

export async function createTrip(data) {
  const response = await fetch(`${BASE_URL}/trips/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create trip')
  return response.json()
}

export async function fetchTripMap(id) {
  const response = await fetch(`${BASE_URL}/trips/${id}/map/`)
  if (!response.ok) throw new Error('Failed to fetch trip map data')
  return response.json()
}

export async function fetchStartTrip(id) {
  const response = await fetch(`${BASE_URL}/trips/${id}/start/`, { method: 'POST' })
  if (!response.ok) throw new Error('Failed to start trip')
  return response.json()
}

export async function fetchCompleteTrip(id) {
  const response = await fetch(`${BASE_URL}/trips/${id}/complete/`, { method: 'POST' })
  if (!response.ok) throw new Error('Failed to complete trip')
  return response.json()
}
