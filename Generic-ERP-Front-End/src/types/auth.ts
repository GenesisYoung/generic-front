export interface LoginRequest {
  username: string
  password: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface Identity {
  id: number
  username: string
  roles: number[]
}

export interface AuthState {
  identity: Identity | null
  accessToken: string | null
  refreshToken: string | null
}
