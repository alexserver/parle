import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { User } from '@prisma/client'
import { prisma } from '../prisma'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: string
  plan: string
}

export interface JWTPayload {
  userId: string
  username: string
  email: string
  role: string
  plan: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here'
const JWT_EXPIRATION = '24h'

export async function validateCredentials(username: string, password: string): Promise<AuthUser | null> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ]
      }
    })

    if (!user) {
      return null
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan
    }
  } catch (error) {
    console.error('Error validating credentials:', error)
    return null
  }
}

export function generateToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    plan: user.plan
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}