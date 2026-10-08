import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTrips, createTrip } from '../api/fleet'

export function useTrips(page = 1, pageSize = 5) {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['trips'],
    queryFn: () => fetchTrips(page, pageSize),
  })

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['trips']})
  }, [page, pageSize])

  return {
    trips: data ?? { results: [], count: 0 },
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
