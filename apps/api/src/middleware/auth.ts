import { Context, Next } from 'hono'
import { createClerkClient } from '@clerk/clerk-sdk-node'
import { logger } from '../services/logger'

// Create Clerk client
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY!
})

// Extend Hono context with user information
declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    user: {
      id: string
      emailAddress?: string
      firstName?: string
      lastName?: string
    }
  }
}

/**
 * Authentication middleware for Hono
 * Verifies Clerk JWT tokens and extracts user information
 */
export const authMiddleware = async (c: Context, next: Next) => {
  try {
    // Extract authorization header
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid Authorization header')
      return c.json({ error: 'Unauthorized: Missing authentication token' }, 401)
    }

    // Extract JWT token
    const token = authHeader.substring(7) // Remove "Bearer " prefix
    
    // Verify token with Clerk
    const verifiedToken = await clerk.verifyToken(token)
    
    if (!verifiedToken || !verifiedToken.sub) {
      logger.warn('Authentication failed: Invalid token')
      return c.json({ error: 'Unauthorized: Invalid token' }, 401)
    }

    // Get user information from Clerk
    const user = await clerk.users.getUser(verifiedToken.sub)
    
    if (!user) {
      logger.warn('Authentication failed: User not found', { userId: verifiedToken.sub })
      return c.json({ error: 'Unauthorized: User not found' }, 401)
    }

    // Set user context
    c.set('userId', user.id)
    c.set('user', {
      id: user.id,
      emailAddress: user.emailAddresses?.[0]?.emailAddress,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined
    })

    logger.info('User authenticated successfully', { 
      userId: user.id,
      email: user.emailAddresses?.[0]?.emailAddress 
    })

    // Continue to next middleware/handler
    await next()

  } catch (error) {
    logger.error('Authentication middleware error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return c.json({ error: 'Authentication failed' }, 401)
  }
}

/**
 * Optional middleware - allows both authenticated and unauthenticated requests
 * Sets user context if token is valid, but doesn't reject if missing
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const verifiedToken = await clerk.verifyToken(token)
      
      if (verifiedToken && verifiedToken.sub) {
        const user = await clerk.users.getUser(verifiedToken.sub)
        if (user) {
          c.set('userId', user.id)
          c.set('user', {
            id: user.id,
            emailAddress: user.emailAddresses?.[0]?.emailAddress,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined
          })
        }
      }
    }

    await next()
  } catch (error) {
    // Don't fail the request for optional auth
    logger.warn('Optional auth middleware error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    await next()
  }
}