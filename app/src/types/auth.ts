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
  email: string
  displayName: string
}

export interface AuthState {
  identity: Identity | null
  accessToken: string | null
  refreshToken: string | null
}
