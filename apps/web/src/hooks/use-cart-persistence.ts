import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useCart } from './use-cart'
import { api } from '~/utils/api'
import { setItems } from '~/store/slices/cartSlice'

const GUEST_CART_KEY = 'guest-cart'

export function useCartPersistence() {
  const { data: session } = useSession()
  const { dispatch, items } = useCart()

  // Fetch server cart for authenticated users
  const { data: serverCart } = api.cart.get.useQuery(undefined, {
    enabled: !!session?.user,
  })

  // Load cart on mount
  useEffect(() => {
    if (session?.user) {
      // Authenticated: Load from server
      if (serverCart) {
        // Serialize dates for Redux state
        const serializedItems = serverCart.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          product: {
            ...item.product,
            createdAt: item.product.createdAt.toISOString(),
            updatedAt: item.product.updatedAt.toISOString(),
          },
        }))
        dispatch(setItems(serializedItems))

        // Migrate guest cart if exists
        const guestCart = localStorage.getItem(GUEST_CART_KEY)
        if (guestCart) {
          // TODO: Merge guest cart with server cart
          localStorage.removeItem(GUEST_CART_KEY)
        }
      }
    } else {
      // Guest: Load from localStorage
      const savedCart = localStorage.getItem(GUEST_CART_KEY)
      if (savedCart) {
        const cartItems = JSON.parse(savedCart)
        dispatch(setItems(cartItems))
      }
    }
  }, [session, serverCart, dispatch])

  // Persist cart changes to localStorage (guests only)
  useEffect(() => {
    if (!session?.user) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
    }
  }, [items, session])
}
