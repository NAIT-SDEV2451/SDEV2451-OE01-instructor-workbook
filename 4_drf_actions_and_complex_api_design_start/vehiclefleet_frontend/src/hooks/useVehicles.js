import { useQuery } from '@tanstack/react-query'
import { fetchVehicles } from '../api/fleet'

export function useVehicles() {
  const { data: vehicles = [], isLoading, isError, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
  })
  return { vehicles, isLoading, isError, error }
}
