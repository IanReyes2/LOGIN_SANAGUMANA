import { prisma } from "./prisma"
import type { User } from "@prisma/client"

// Create a new user (stores plain password)
export async function createUser(email: string, password: string, name?: string) {
  // Prevent duplicate email
  const existing = await getUserByEmail(email)
  if (existing) {
    throw new Error("Email already registered")
  }

  return await prisma.user.create({
    data: {
      email,
      password, // stored directly, no hashing
      name,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  })
}

// Find user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
  })
}

// Authenticate user (check plain password)
export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email)
  if (!user) return null

  if (user.password !== password) return null

  // Return safe fields only
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  }
}
