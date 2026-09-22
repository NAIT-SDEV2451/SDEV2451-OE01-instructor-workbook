import { useQuery } from '@tanstack/react-query'
import { fetchDrivers } from '../api/fleet'

export function useDrivers(search = "") {
  const { data: drivers = [], isLoading, isError, error } = useQuery({
    queryKey: ['drivers', search],
    queryFn: () => fetchDrivers(search),
  })

  return { drivers, isLoading, isError, error }
}
