import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    // Marks a request that has already been replayed after a token refresh.
    _retried?: boolean
  }
}

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

const REFRESH_URL = '/auth/refresh/access'

// ── Request interceptor ───────────────────────────────────────────────────────
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const store = getAuthStore()
  if (config.url === REFRESH_URL) {
    config.headers['X-Refresh-Request'] = '1'
  } else if (store?.accessToken) {
    config.headers.Authorization = `Bearer ${store.accessToken}`
  }
  return config
})

// ── Response interceptor ──────────────────────────────────────────────────────
let isRefreshing = false
let waitingQueue: Array<{
  resolve: (token: string) => void
  reject: (reason: unknown) => void
}> = []

http.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const store = getAuthStore()
    const originalRequest = error.config as InternalAxiosRequestConfig | undefined

    // Guard 0: no config means we have nothing to replay (request never left).
    if (!originalRequest) return Promise.reject(error)

    // Guard 1: THE FIX. Anything that is not an auth failure passes straight
    // through untouched — 500, 404, network timeout, CORS. No refresh, no retry.
    if (error.response?.status !== 401) return Promise.reject(error)

    // Guard 2: the refresh endpoint itself returned 401 -> refresh token is dead.
    if (originalRequest.url?.includes(REFRESH_URL)) {
      store?.logout()
      return Promise.reject(error)
    }

    // Guard 3: we already replayed this request once and it 401'd again.
    if (originalRequest._retried) {
      return Promise.reject(error)
    }

    if (!store?.identity) {
      store?.logout()
      return Promise.reject(error)
    }

    // Set the flag now, so both the queued path and the direct path are covered.
    originalRequest._retried = true

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitingQueue.push({
          resolve: (newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(http(originalRequest))
          },
          reject,
        })
      })
    }

    isRefreshing = true
    try {
      const newAccessToken = await store.refresh()
      const queue = waitingQueue
      waitingQueue = []
      queue.forEach((p) => p.resolve(newAccessToken!))
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return http(originalRequest)
    } catch (refreshError) {
      const queue = waitingQueue
      waitingQueue = []
      // Every queued caller must be settled, or their awaits hang forever.
      queue.forEach((p) => p.reject(refreshError))
      store.logout()
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default http
