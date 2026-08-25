/** Shared authentication types used by the auth store and API layer. */

/** Payload sent to POST /api/auth/login. */
export interface LoginRequest {
  username: string
  password: string
}

/** JWT pair returned by the backend on a successful login. */
export interface TokenPair {
  accessToken: string
  /** The backend stores this in an HttpOnly cookie and returns null to JavaScript. */
  refreshToken: null
}

/** The authenticated user's profile, as returned by the backend. */
export interface Identity {
  id: number
  name: string
  email: string
  displayName: string
  avator: string
}

/** Shape of the persisted auth store state (see stores/auth.ts). */
export interface AuthState {
  identity: Identity | null
  accessToken: string | null
}
