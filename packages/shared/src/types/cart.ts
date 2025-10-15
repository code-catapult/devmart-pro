/**
 * Cart Type Definitions
 *
 * Used in Redux store and cart API endpoints.
 * Based on the Prisma CartItem model from Story 1.2.
 */

import type { ProductListItem } from "./product";

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemWithProduct extends CartItem {
  product: ProductListItem;
}

// Redux cart state interface
export interface CartState {
  items: CartItemWithProduct[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}
