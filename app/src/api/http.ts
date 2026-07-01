import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
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
  } else if (store?.accessToken) {
    config.headers.Authorization = `Bearer ${store.accessToken}`
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
    return resp
  },
  async (error: AxiosResponse) => {
    const originalRequest = error.config
    // Only handle 401 errors, and only retry once (avoid infinite loop).
    if (error?.status !== 403 || originalRequest._retried) {
      return Promise.reject(error)
    }

    originalRequest._retried = true

    const store = getAuthStore()
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
      waitingQueue.forEach((cb) => cb(newAccessToken))
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
