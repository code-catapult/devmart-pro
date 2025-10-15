/**
 * Order Type Definitions
 *
 * Used in customer order history and admin order management.
 * Based on the Prisma Order model from Story 1.2.
 */

import { OrderStatus } from "@prisma/client";
export { OrderStatus };
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  subtotal: number; // In cents
  tax: number; // In cents
  shipping: number; // In cents
  total: number; // In cents
  stripePaymentIntentId: string | null;
  shippingAddress: unknown; // JSON field from Prisma
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number; // In cents
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
