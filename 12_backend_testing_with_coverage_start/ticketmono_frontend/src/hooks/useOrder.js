import { useQuery } from '@tanstack/react-query'
import { fetchOrder } from '../api/orders'

export function useOrder(id) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => fetchOrder(id),
  })
}
