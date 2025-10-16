import { Redis } from '@upstash/redis'

/**
 * Cache Configuration
 *
 * Centralized Redis client with graceful degradation.
 * If Redis is not configured, caching is disabled and app falls back to direct DB queries.
 */

// Validate environment variables
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const cacheEnabled = process.env.ENABLE_CACHE !== 'false' // Allow disabling cache

// Initialize Redis client (or null if not configured)
let redis: Redis | null = null

if (cacheEnabled && redisUrl && redisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    })
    console.log('✅ Redis cache initialized')
  } catch (error) {
    console.error('❌ Redis initialization failed:', error)
    console.warn('⚠️  Continuing without cache (degraded performance)')
  }
} else {
  if (!cacheEnabled) {
    console.warn('⚠️  Cache disabled via ENABLE_CACHE=false')
  } else {
    console.warn('⚠️  Redis not configured (missing REDIS_URL or REDIS_TOKEN)')
    console.warn('   Dashboard will work but with slower response times')
    console.warn('   Set up Redis: https://upstash.com')
  }
}

/**
 * Get cached data or fetch if missing (Cache-Aside pattern)
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  if (!redis) return fetcher()

  try {
    const cached = await redis.get<T>(key)
    if (cached !== null && cached !== undefined) {
      console.log(`✅ Cache HIT: ${key}`)
      return cached
    }
    console.log(`❌ Cache MISS: ${key}`)
  } catch (error) {
    console.error(`⚠️  Redis read error for key "${key}":`, error)
    console.warn('   Falling back to direct fetch (cache bypassed)')
  }

  const data = await fetcher()

  if (redis) {
    redis
      .set(key, data, { ex: ttl })
      .then(() => console.log(`💾 Cached: ${key} (TTL: ${ttl}s)`))
      .catch((error) =>
        console.error(`⚠️  Redis write error for key "${key}":`, error)
      )
  }

  return data
}

/**
 * Invalidate cache by pattern (SCAN-based)
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return

  try {
    const keysToDelete: string[] = []
    let cursor = '0'

    do {
      const result = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      })

      cursor = result[0]
      const keys = result[1]

      if (keys?.length) keysToDelete.push(...keys)
    } while (cursor !== '0')

    if (keysToDelete.length > 0) {
      const batchSize = 100
      for (let i = 0; i < keysToDelete.length; i += batchSize) {
        const batch = keysToDelete.slice(i, i + batchSize)
        await redis.del(...batch)
      }

      console.log(
        `🗑️  Invalidated ${keysToDelete.length} cache keys matching: "${pattern}"`
      )
    } else {
      console.log(`ℹ️  No cache keys found matching: "${pattern}"`)
    }
  } catch (error) {
    console.error(
      `⚠️  Cache invalidation error for pattern "${pattern}":`,
      error
    )
  }
}

/**
 * Invalidate specific cache key
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  if (!redis) return
  try {
    const result = await redis.del(key)
    if (result > 0) {
      console.log(`🗑️  Invalidated cache key: "${key}"`)
    }
  } catch (error) {
    console.error(`⚠️  Cache invalidation error for key "${key}":`, error)
  }
}

/**
 * Clear all cache (use sparingly!)
 */
export async function clearAllCache(): Promise<void> {
  if (!redis) return
  try {
    await redis.flushdb()
    console.log('🗑️  All cache cleared')
  } catch (error) {
    console.error('⚠️  Cache clear error:', error)
  }
}

/**
 * Get cache statistics (Upstash-compatible)
 *
 * Since Upstash doesn't support the `INFO` command,
 * we provide a lightweight health check instead.
 */
export async function getCacheStats() {
  if (!redis) {
    return { enabled: false, message: 'Cache not configured' }
  }

  try {
    // Simple health check via ping
    const ping = await redis.ping()
    const testKey = '__health_check__'
    const start = performance.now()
    await redis.set(testKey, 'ok', { ex: 5 })
    const value = await redis.get(testKey)
    const latency = Math.round(performance.now() - start)

    return {
      enabled: true,
      connected: ping === 'PONG',
      latencyMs: latency,
      cacheWorking: value === 'ok',
      message: 'Upstash Redis connection healthy',
    }
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
