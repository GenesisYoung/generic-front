/**
 * Shared Axios instance for all backend calls.
 *
 * Responsibilities:
 * - attach the JWT access token (or the refresh token on refresh calls)
 * - proactively rotate the refresh token when it is close to expiring
 * - on an auth failure, silently refresh the access token and retry the
 *   original request once, queueing concurrent failures during the refresh
 */
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    // Marks a request that has already been retried after a token refresh,
    // so a second failure is not retried again (prevents infinite loops).
    _retried?: boolean
  }
}

// We use a factory function to avoid a circular import between
// http.ts and auth.ts (the store imports http, http imports the store).
let getAuthStore: () => ReturnType<typeof import('@/stores/auth').useAuthStore> | null = () => null

export function registerAuthStore(
  fn: () => ReturnType<typeof import('@/stores/auth').useAuthStore>,
) {
  getAuthStore = fn
}

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  timeout: 10000,
  withCredentials: true,
})

// ── Request interceptor ───────────────────────────────────────────────────────
// Runs before EVERY request. Attaches the access token if it exists.
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const store = getAuthStore()
  if ('/auth/refresh/access' === config.url && store?.refreshToken) {
    config.headers.Authorization = `Bearer ${store.refreshToken}`
    config.headers['Refresh-Token'] = store.refreshToken
  } else if (store?.accessToken) {
    config.headers.Authorization = `Bearer ${store.accessToken}`
    config.headers['Refresh-Token'] = store.refreshToken
  }
  return config
})

// ── Response interceptor ──────────────────────────────────────────────────────
// Runs after EVERY response.
// If the server returns 401, attempt a token refresh and retry once.
let isRefreshing = false
let waitingQueue: Array<(token: string) => void> = []

http.interceptors.response.use(
  (resp) => {
    // The backend reports the refresh token's remaining lifetime on every
    // response; rotate proactively when less than 24h remain.
    const expires = Number.parseInt(resp.headers['Refresh-Token-Remaining'])
    if (expires < 1000 * 60 * 60 * 24) {
      getAuthStore()?.refresh()
    }
    return resp
  },
  async (error: AxiosResponse) => {
    const store = getAuthStore()
    const originalRequest = error.config
    if (originalRequest.url?.includes('/auth/refresh/access')) {
      store?.logout()
      return Promise.reject(error)
    }
    if (error?.status !== 403 || originalRequest._retried) {
      // Only handle 401 errors, and only retry once (avoid infinite loop).
      return Promise.reject(error)
    }

    originalRequest._retried = true

    if (!store?.refreshToken) {
      store?.logout()
      return Promise.reject(error)
    }

    // If a refresh is already in progress, queue this request.
    // This handles the case where multiple requests fail at the same time.
    if (isRefreshing) {
      return new Promise((resolve) => {
        waitingQueue.push((newToken: string) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          resolve(http(originalRequest))
        })
      })
    }

    isRefreshing = true

    try {
      const newAccessToken = await store.refresh()
      // Retry all queued requests with the new token.
      waitingQueue.forEach((cb) => cb(newAccessToken!))
      waitingQueue = []
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return http(originalRequest)
    } catch {
      store.logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default http
