import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// We use a factory function to avoid a circular import between
// http.ts and auth.ts (the store imports http, http imports the store).
let getAuthStore: () => ReturnType<typeof import('@/stores/auth').useAuthStore> | null = () => null

export function registerAuthStore(
  fn: () => ReturnType<typeof import('@/stores/auth').useAuthStore>,
) {
  getAuthStore = fn
}

const http: AxiosInstance = axios.create({
  baseURL: 'https://localhost:8443',
  timeout: 10000,
  withCredentials: true,
})

// ── Request interceptor ───────────────────────────────────────────────────────
// Runs before EVERY request. Attaches the access token if it exists.
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const store = getAuthStore()
  if (store?.accessToken) {
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
  (response: AxiosResponse) => response,

  async (error) => {
    const originalRequest = error.config

    // Only handle 401 errors, and only retry once (avoid infinite loop).
    if (error.response?.status !== 401 || originalRequest._retried) {
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
