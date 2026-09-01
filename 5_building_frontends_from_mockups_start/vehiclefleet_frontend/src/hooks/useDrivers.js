import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDrivers } from '../api/fleet'

export function useDrivers(search = '') {
  const queryClient = useQueryClient()

  const { data: drivers = [], isLoading, isError, error } = useQuery({
    queryKey: ['drivers', search],
    queryFn: () => fetchDrivers(search),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['drivers', search] })
  }

  return { drivers, isLoading, isError, error, invalidate }
}
