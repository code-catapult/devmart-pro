import { useSession } from 'next-auth/react'
import { useCart } from './use-cart'
import { api } from '~/utils/api'
import {
  addItemOptimistic,
  updateQuantityOptimistic,
  removeItemOptimistic,
  openCart,
} from '~/store/slices/cartSlice'
import { toast } from 'sonner'
import type { Product } from '@prisma/client'
import { SerializeDates } from '~/lib/utils/serialize'

export function useOptimisticCart() {
  const { data: session } = useSession()
  const { dispatch, items } = useCart()
  const utils = api.useUtils()

  const addItemMutation = api.cart.addItem.useMutation({
    onSuccess: () => {
      // Invalidate cart query to refetch
      void utils.cart.get.invalidate()
    },
  })

  const updateItemMutation = api.cart.updateItem.useMutation()
  const removeItemMutation = api.cart.removeItem.useMutation()

  const addItem = async (
    productId: string,
    quantity: number,
    product: SerializeDates<Product>
  ) => {
    if (!session?.user) {
      // Guest: Just update Redux and localStorage
      const tempId = `temp-${Date.now()}`
      dispatch(
        addItemOptimistic({
          item: {
            id: tempId,
            userId: 'guest',
            productId,
            quantity,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            product: product,
          },
        })
      )

      dispatch(openCart())

      toast.success('Added to cart', {
        description: `${quantity} × ${product.name}`,
      })

      return
    }

    // Authenticated: Optimistic update + server mutation
    const previousItems = [...items]

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    dispatch(
      addItemOptimistic({
        item: {
          id: tempId,
          userId: session.user.id,
          productId,
          quantity,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          product: product,
        },
      })
    )

    dispatch(openCart())

    toast.success('Added to cart', {
      description: `${quantity} × ${product.name}`,
    })

    // Server mutation
    try {
      await addItemMutation.mutateAsync({ productId, quantity })
    } catch (error) {
      // Rollback on error
      dispatch({ type: 'cart/setItems', payload: previousItems })
      toast.error('Error adding to cart', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const updateItem = async (cartItemId: string, quantity: number) => {
    const previousItems = [...items]

    // Optimistic update
    dispatch(updateQuantityOptimistic({ cartItemId, quantity }))

    if (session?.user) {
      // Server mutation for authenticated users
      try {
        await updateItemMutation.mutateAsync({
          cartItemId,
          quantity,
        })
      } catch {
        // Rollback
        dispatch({ type: 'cart/setItems', payload: previousItems })
        toast.error('Error updating cart')
      }
    }
  }

  const removeItem = async (cartItemId: string) => {
    const previousItems = [...items]

    // Optimistic update
    dispatch(removeItemOptimistic(cartItemId))

    if (session?.user) {
      try {
        await removeItemMutation.mutateAsync({ cartItemId })
      } catch {
        // Rollback
        dispatch({ type: 'cart/setItems', payload: previousItems })
        toast.error('Error removing item')
      }
    }
  }

  return {
    addItem,
    updateItem,
    removeItem,
    isAdding: addItemMutation.isPending,
  }
}
