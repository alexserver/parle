import { Context, Next } from 'hono'
import { logger } from '../services/logger'

// Extend Hono context with user information
declare module 'hono' {
  interface ContextVariableMap {
    userId: string
  }
}

/**
 * Simple auth middleware - just extracts user ID from header
 * Trusts the frontend to provide the correct user ID after Clerk authentication
 */
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    // Extract user ID from header
    const userId = c.req.header('X-User-Id')
    
    if (!userId) {
      logger.warn('Authentication failed: Missing user ID header')
      return c.json({ error: 'Unauthorized: Missing user ID' }, 401)
    }

    // Set user context
    c.set('userId', userId)

    logger.info('User authenticated successfully', { userId })

    // Continue to next middleware/handler
    await next()

  } catch (error) {
    logger.error('Authentication middleware error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return c.json({ error: 'Authentication failed' }, 401)
  }
}

/**
 * Optional middleware - allows both authenticated and unauthenticated requests
 * Sets user context if user ID is provided
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const userId = c.req.header('X-User-Id')
    
    if (userId) {
      c.set('userId', userId)
      logger.info('Optional auth: User ID set', { userId })
    }

    await next()
  } catch (error) {
    logger.warn('Optional auth middleware error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    await next()
  }
}