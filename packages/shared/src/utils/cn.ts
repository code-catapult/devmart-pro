/**
 * Tailwind Class Name Utility
 *
 * Merges Tailwind classes with proper precedence.
 * Uses clsx for conditional classes and tailwind-merge for deduplication.
 *
 * @example
 * cn("px-2 py-1", isActive && "bg-blue-500")
 * // → "px-2 py-1 bg-blue-500" (if isActive is true)
 *
 * cn("px-2", "px-4")
 * // → "px-4" (tailwind-merge removes conflicting px-2)
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
