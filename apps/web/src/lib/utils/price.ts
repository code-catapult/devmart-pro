/**
 * Format price from cents to dollar string
 * @param cents - Price in cents (e.g., 2999 = $29.99)
 * @returns Formatted price string (e.g., "$29.99")
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars)
}

/**
 * Parse dollar string to cents
 * @param price - Price string (e.g., "$29.99" or "29.99")
 * @returns Price in cents (e.g., 2999)
 */
export function parsePriceToCents(price: string): number {
  const cleaned = price.replace(/[^0-9.]/g, '')
  const dollars = parseFloat(cleaned)
  return Math.round(dollars * 100)
}
