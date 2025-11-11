/**
 * User Type Definitions
 *
 * Shared across authentication, user profile, and admin user management.
 * Based on the Prisma User model from Story 1.2.
 */

import { Role } from "@prisma/client";
export { Role };
/**
 * Base user type
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerified: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User session data (used in auth contexts)
 */
export interface UserSession {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  emailVerified: Date | null;
}

/**
 * User List Types
 *
 * These types define the shape of data for the user list page.
 * We keep them in a separate file for reusability across components.
 */

export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type SortField = "name" | "email" | "createdAt" | "totalSpent";
export type SortOrder = "asc" | "desc";

/**
 * Filters applied to the user list
 */
export interface UserListFilters {
  search: string; // Search across name and email
  role: "ALL" | UserRole; // Filter by user role
  status: "ALL" | UserStatus; // Filter by account status
  sortBy: SortField; // Which field to sort by
  sortOrder: SortOrder; // Ascending or descending
  page: number; // Current page (1-indexed)
  limit: number; // Results per page
}

/**
 * A single user in the list
 */
export interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  suspended: boolean;
  suspendedAt: Date | null;
  createdAt: Date;
  totalSpent: number; // Calculated from orders
  orderCount: number; // Total completed orders
}

/**
 * Paginated response from the server
 */
export interface UserListResponse {
  users: UserListItem[];
  pagination: {
    total: number; // Total users matching filters
    page: number; // Current page
    limit: number; // Results per page
    totalPages: number; // Total pages available
  };
}
