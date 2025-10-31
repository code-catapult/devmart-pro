/**
 * Simple in-memory rate limiter
 *
 * For production with multiple servers, use Redis or database-backed rate limiting.
 * This implementation is suitable for single-server deployments or low-traffic apps.
 *
 * IMPORTANT: This resets on server restart. For persistent rate limiting across
 * deployments, implement with Redis (Upstash) or database.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(
  () => {
    const now = Date.now()
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  },
  5 * 60 * 1000
)

/**
 * Rate limit function
 *
 * @param identifier - Unique identifier (usually user ID)
 * @param limit - Maximum requests allowed in window (default: 10)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Success status, remaining requests, and reset time
 */
export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): {
  success: boolean
  remaining: number
  resetTime?: number
} {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)

  // No previous requests or window expired - create new entry
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      success: true,
      remaining: limit - 1,
    }
  }

  // Limit exceeded
  if (userLimit.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: userLimit.resetTime,
    }
  }

  // Increment counter
  userLimit.count++
  return {
    success: true,
    remaining: limit - userLimit.count,
  }
}

/**
 * Reset rate limit for specific identifier
 * Useful for testing or manual intervention
 */
export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier)
}

/**
 * Get rate limit statistics
 * Useful for monitoring and debugging
 */
export function getRateLimitStats(): {
  totalIdentifiers: number
  entries: Array<{ identifier: string; count: number; resetsIn: number }>
} {
  const now = Date.now()
  const entries: Array<{
    identifier: string
    count: number
    resetsIn: number
  }> = []

  for (const [identifier, entry] of rateLimitMap.entries()) {
    entries.push({
      identifier,
      count: entry.count,
      resetsIn: Math.max(0, entry.resetTime - now),
    })
  }

  return {
    totalIdentifiers: rateLimitMap.size,
    entries,
  }
}
