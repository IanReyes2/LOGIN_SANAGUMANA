export interface User {
  id: string
  email: string
  name?: string
  createdAt: string
}

export interface AuthResponse {
  user?: User
  message?: string
  error?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name?: string
}
