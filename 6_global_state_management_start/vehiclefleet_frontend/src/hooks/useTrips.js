import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTrips, createTrip } from '../api/fleet'

export function useTrips() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  })

  return {
    trips: data ?? [],
    isLoading,
    isError,
    error,
  }
}

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
