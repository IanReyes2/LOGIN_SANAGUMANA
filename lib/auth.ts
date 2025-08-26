import bcrypt from "bcryptjs"
import { prisma } from "./prisma"

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hashPassword(password)

  return await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  })
}

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  })
}

export async function authenticateUser(email: string, password: string) {
  const user = await getUserByEmail(email)

  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.password)

  if (!isValid) {
    return null
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}
