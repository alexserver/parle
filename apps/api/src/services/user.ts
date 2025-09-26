import { User, UserRole, UserPlan } from '@prisma/client'
import { prisma } from '../prisma'

export async function getUserById(id: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { id }
    })
  } catch (error) {
    console.error('Error fetching user by ID:', error)
    return null
  }
}

export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { username }
    })
  } catch (error) {
    console.error('Error fetching user by username:', error)
    return null
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { email }
    })
  } catch (error) {
    console.error('Error fetching user by email:', error)
    return null
  }
}

export function isAdmin(user: User): boolean {
  return user.role === UserRole.admin
}

export function isMember(user: User): boolean {
  return user.role === UserRole.member
}

export function hasPaidPlan(user: User): boolean {
  return user.plan === UserPlan.paid
}

export function hasFreePlan(user: User): boolean {
  return user.plan === UserPlan.free
}

export function canAccessAdminFeatures(user: User): boolean {
  return isAdmin(user)
}

export function canAccessPaidFeatures(user: User): boolean {
  return hasPaidPlan(user) || isAdmin(user)
}