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
