import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchVehicles } from '../api/fleet'

export function useVehicles(search = '') {
  const queryClient = useQueryClient()

  const { data: vehicles = [], isLoading, isError, error } = useQuery({
    queryKey: ['vehicles', search],
    queryFn: () => fetchVehicles(search),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['vehicles', search] })
  }

  return { vehicles, isLoading, isError, error, invalidate }
}
