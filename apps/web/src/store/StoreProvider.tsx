'use client'

import { Provider } from 'react-redux'
import { store } from './index'
import { useCartPersistence } from '~/hooks/use-cart-persistence'

interface StoreProviderProps {
  children: React.ReactNode
}

// Side-effect component for cart persistence
function CartPersistence() {
  useCartPersistence()
  return null // No UI - just runs persistence effects
}

export function StoreProvider({ children }: StoreProviderProps) {
  return (
    <Provider store={store}>
      <CartPersistence />
      {children}
    </Provider>
  )
}
