import http from '@/api/http'
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
  const isDevmode = ref(import.meta.env.VITE_APP_DEV_MODE === 'true')

  // ── Getters ───────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!accessToken.value && !!identity.value)

  watch(
    [identity, accessToken],
    () => {
      localStorage.setItem(
        'auth-session',
        JSON.stringify({
          identity: identity.value,
          accessToken: accessToken.value,
        }),
      )
    },
    { deep: true },
  )

  // ── Actions ───────────────────────────────────────────────────────────────

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
      object: { accessToken: TokenPair | null }
    }>('/auth/refresh/access')
    const data = response.data
    // debugger
    if (data.status !== 200 || !data.object) {
      throw new Error(data.message)
    }
    accessToken.value = data.object.accessToken.accessToken
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
    setTimeout(() => {
      window.location.reload()
    }, 50)
    router.push('/login')
  }

  return {
    identity,
    accessToken,
    isAuthenticated,
    isDevmode,
    login,
    refresh,
    logout,
  }
})
