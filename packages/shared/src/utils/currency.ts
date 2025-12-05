/**
 * Currency Formatting Utilities
 *
 * Handles currency formatting and parsing for the application.
 * Prices are stored as integers (cents) to avoid floating-point precision issues.
 *
 * @example
 * formatPrice(2999)  // → "$29.99"
 * parsePriceToCents("$29.99")  // → 2999
 */

/**
 * Format cents to currency string
 * @param cents - Price in cents (e.g., 2999 = $29.99)
 * @returns Formatted currency string
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

/**
 * Parse dollar string to cents
 * @param price - Price string (e.g., "$29.99" or "29.99")
 * @returns Price in cents
 */
export function parsePriceToCents(price: string): number {
  const cleaned = price.replace(/[^0-9.]/g, "");
  const dollars = parseFloat(cleaned);
  return Math.round(dollars * 100);
}

// Alias for consistency with other applications
export const formatCurrency = formatPrice;
