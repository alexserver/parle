import { Hono } from 'hono'
import { z } from 'zod'
import { validateCredentials, generateToken } from '../services/auth'

const auth = new Hono()

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
})

auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    
    const validatedData = loginSchema.parse(body)
    
    const user = await validateCredentials(validatedData.username, validatedData.password)
    
    if (!user) {
      return c.json(
        { error: 'Invalid username or password' },
        401
      )
    }

    const token = generateToken(user)
    
    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan
      }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        { error: 'Invalid input', details: error.errors },
        400
      )
    }
    
    console.error('Login error:', error)
    return c.json(
      { error: 'Internal server error' },
      500
    )
  }
})

export { auth }