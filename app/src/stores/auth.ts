import http from '@/api/http'
import { hasPermission, type PermissionSet } from '@/assets/config/auth'
import { lan } from '@/lang/china_zh'
import type { Identity, TokenPair } from '@/types/auth'
import { globalUtil } from '@/utils/util'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
type Lan = Record<string, string>
const lang: Lan = lan
export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()
  type StoredAuth = {
    identity: Identity | null
    accessToken: string | null
    permissions?: PermissionSet | null
  }
  let restored: StoredAuth | null = null
  try {
    const stored = localStorage.getItem('auth-session')
    restored = stored ? (JSON.parse(stored) as StoredAuth) : null
  } catch {
    localStorage.removeItem('auth-session')
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const identity = ref<Identity | null>(restored?.identity ?? null)
  const accessToken = ref<string | null>(restored?.accessToken ?? null)
  // Cached so the UI renders immediately on reload; refreshed by loadPermissions().
  const permissions = ref<PermissionSet | null>(restored?.permissions ?? null)
  const permissionsLoaded = ref(false)
  const isDevmode = ref(import.meta.env.VITE_APP_DEV_MODE === 'true')

  // ── Getters ───────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!accessToken.value && !!identity.value)

  watch(
    [identity, accessToken, permissions],
    () => {
      localStorage.setItem(
        'auth-session',
        JSON.stringify({
          identity: identity.value,
          accessToken: accessToken.value,
          permissions: permissions.value,
        }),
      )
    },
    { deep: true },
  )

  /** True when the user may perform `code` (UI hint only; the backend re-checks). */
  function can(code: string): boolean {
    return hasPermission(permissions.value, code)
  }

  /** True when the user holds at least one of `codes`. */
  function canAny(...codes: string[]): boolean {
    return codes.some(can)
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Fetches the user's current permission codes. Called once per page load by
   * the router guard and again whenever the window regains focus, so grants and
   * revocations made by an admin show up without logging out.
   */
  async function loadPermissions(): Promise<void> {
    if (!accessToken.value) return
    try {
      const response = await http.get<{ status: number; object: PermissionSet }>(
        '/users/permissions',
      )
      if (response.data.status === 200 && response.data.object) {
        permissions.value = response.data.object
      }
    } catch {
      // Keep the cached set; a 401 here is handled by the interceptor.
    } finally {
      permissionsLoaded.value = true
    }
  }

  /**
   * Called when the user submits the login form.
   * The backend returns an access token, a refresh token, and user identity.
   */
  async function login(username: string, password: string): Promise<void> {
    const response = await http.post<{
      status: number
      object: { tokens: TokenPair; user: Identity }
      message: string
    }>('/auth/login', {
      username,
      password,
    })
    if (response.data.status !== 200) {
      if (response.data.status === 401)
        await globalUtil.activeDialog(lang?.loginFailure, response.data.message, undefined, 1)
      else if (response.data.status === 402)
        await globalUtil.activeDialog(lang?.disabledUser, response.data.message, undefined, 1)
      return
    }

    accessToken.value = response.data.object!.tokens.accessToken
    identity.value = response.data.object!.user
    console.log(response.headers.getSetCookie)
    setTimeout(() => {
      window.location.reload()
    }, 200)
    await router.push('/')
  }

  /**
   * Called automatically by the Axios interceptor when a 401 is received.
   * Returns the new access token so the interceptor can retry the request.
   */
  async function refresh(): Promise<string | null> {
    const response = await http.post<{
      status: number
      message: string
      object: { accessToken: string | null }
    }>('/auth/refresh/access')
    const data = response.data
    // debugger
    if (data.status !== 200 || !data.object) {
      throw new Error(data.message)
    }
    accessToken.value = data.object.accessToken
    return accessToken.value
  }

  /**
   * Clears all state and sends the user to the login page.
   */
  function logout(): void {
    if (accessToken.value) {
      const token = accessToken.value
      void http
        .post('/auth/logout', undefined, { headers: { Authorization: `Bearer ${token}` } })
        .catch(() => undefined)
    }
    identity.value = null
    accessToken.value = null
    permissions.value = null
    permissionsLoaded.value = false
    setTimeout(() => {
      window.location.reload()
    }, 50)
    router.push('/login')
  }

  return {
    identity,
    accessToken,
    permissions,
    permissionsLoaded,
    isAuthenticated,
    isDevmode,
    can,
    canAny,
    loadPermissions,
    login,
    refresh,
    logout,
  }
})
