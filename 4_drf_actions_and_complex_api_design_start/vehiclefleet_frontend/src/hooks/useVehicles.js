import { useQuery } from '@tanstack/react-query'
import { fetchVehicles } from '../api/fleet'

export function useVehicles(search = "") {
  const { data: vehicles = [], isLoading, isError, error } = useQuery({
    queryKey: ['vehicles', search],
    queryFn: () => fetchVehicles(search),
  })
  return { vehicles, isLoading, isError, error }
}
