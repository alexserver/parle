import { Context, Next } from 'hono'
import { logger } from '../services/logger'
import { verifyToken, JWTPayload } from '../services/auth'
import { getUserById } from '../services/user'
import { User } from '@prisma/client'

// Extend Hono context with user information
declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    user: User
    userPayload: JWTPayload
  }
}

/**
 * JWT-based auth middleware - validates JWT token and sets user context
 */
export const authMiddleware = async (c: Context, next: Next): Promise<Response | void> => {
  try {
    // Extract token from Authorization header
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid Authorization header')
      return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401)
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix
    
    // Verify JWT token
    const payload = verifyToken(token)
    if (!payload) {
      logger.warn('Authentication failed: Invalid or expired token')
      return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401)
    }

    // Get fresh user data from database
    const user = await getUserById(payload.userId)
    if (!user) {
      logger.warn('Authentication failed: User not found', { userId: payload.userId })
      return c.json({ error: 'Unauthorized: User not found' }, 401)
    }

    // Set user context
    c.set('userId', user.id)
    c.set('user', user)
    c.set('userPayload', payload)

    logger.info('User authenticated successfully', { 
      userId: user.id, 
      username: user.username,
      role: user.role 
    })

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
 * Sets user context if valid token is provided
 */
export const optionalAuthMiddleware = async (c: Context, next: Next): Promise<void> => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      
      if (payload) {
        const user = await getUserById(payload.userId)
        if (user) {
          c.set('userId', user.id)
          c.set('user', user)
          c.set('userPayload', payload)
          logger.info('Optional auth: User authenticated', { userId: user.id })
        }
      }
    }

    await next()
  } catch (error) {
    logger.warn('Optional auth middleware error', { 
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    await next()
  }
}