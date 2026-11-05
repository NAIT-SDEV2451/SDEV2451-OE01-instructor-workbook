import { useQuery } from '@tanstack/react-query'
import { fetchEvent } from '../api/events'

export function useEvent(id) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => fetchEvent(id),
  })
}
