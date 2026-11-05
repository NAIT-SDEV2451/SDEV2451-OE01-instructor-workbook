import { useMutation } from '@tanstack/react-query'
import { createOrder } from '../api/orders'

export function useCreateOrder() {
  return useMutation({
    mutationFn: createOrder,
  })
}
