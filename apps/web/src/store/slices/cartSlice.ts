import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Product, CartItem } from '@repo/shared/types'

// Serializable versions with Date objects converted to strings for Redux
type SerializableProduct = Omit<Product, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

type SerializableCartItem = Omit<CartItem, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

interface CartItemWithProduct extends SerializableCartItem {
  product: SerializableProduct
}

interface CartState {
  items: CartItemWithProduct[]
  isOpen: boolean
  totalItems: number
  totalPrice: number
}

const initialState: CartState = {
  items: [],
  isOpen: false,
  totalItems: 0,
  totalPrice: 0,
}

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Set cart items (from server or localStorage)
    setItems: (state, action: PayloadAction<CartItemWithProduct[]>) => {
      state.items = action.payload
      state.totalItems = action.payload.reduce(
        (sum, item) => sum + item.quantity,
        0
      )
      state.totalPrice = action.payload.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      )
    },

    // Optimistic add item
    addItemOptimistic: (
      state,
      action: PayloadAction<{ item: CartItemWithProduct }>
    ) => {
      const existing = state.items.find(
        (item) => item.productId === action.payload.item.productId
      )

      if (existing) {
        existing.quantity += action.payload.item.quantity
      } else {
        state.items.push(action.payload.item)
      }

      // Recalculate totals
      state.totalItems = state.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      )
      state.totalPrice = state.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      )
    },

    // Optimistic update quantity
    updateQuantityOptimistic: (
      state,
      action: PayloadAction<{ cartItemId: string; quantity: number }>
    ) => {
      const item = state.items.find((i) => i.id === action.payload.cartItemId)
      if (item) {
        item.quantity = action.payload.quantity

        // Recalculate totals
        state.totalItems = state.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        )
        state.totalPrice = state.items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        )
      }
    },

    // Optimistic remove item
    removeItemOptimistic: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload)

      // Recalculate totals
      state.totalItems = state.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      )
      state.totalPrice = state.items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      )
    },

    // Toggle cart sidebar
    toggleCart: (state) => {
      state.isOpen = !state.isOpen
    },

    // Open cart sidebar
    openCart: (state) => {
      state.isOpen = true
    },

    // Close cart sidebar
    closeCart: (state) => {
      state.isOpen = false
    },

    // Clear cart
    clearCart: (state) => {
      state.items = []
      state.totalItems = 0
      state.totalPrice = 0
    },
  },
})

export const {
  setItems,
  addItemOptimistic,
  updateQuantityOptimistic,
  removeItemOptimistic,
  toggleCart,
  openCart,
  closeCart,
  clearCart,
} = cartSlice.actions

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items
export const selectCartTotal = (state: { cart: CartState }) =>
  state.cart.totalPrice
export const selectItemCount = (state: { cart: CartState }) =>
  state.cart.totalItems
export const selectCartOpen = (state: { cart: CartState }) => state.cart.isOpen

// Default export for reducer (consistent with appSlice and authSlice)
export default cartSlice.reducer
