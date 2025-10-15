/**
 * Product Type Definitions
 *
 * Shared across customer-facing product display and admin product management.
 * Based on the Prisma Product model from Story 1.2.
 */

import { ProductStatus } from "@prisma/client";
export { ProductStatus };

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number; // Stored in cents
  comparePrice: number | null;
  inventory: number;
  images: string[];
  status: ProductStatus;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithCategory extends Product {
  category: Category;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  images: string[];
  inventory: number;
  status: ProductStatus;
}
