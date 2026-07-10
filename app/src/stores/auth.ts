import http from '@/api/http'
import { lan } from '@/lang/china_zh'
import type { Identity, TokenPair } from '@/types/auth'
import { globalUtil } from '@/utils/util'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
type Lan = Record<string, string>
const lang: Lan = lan
export const useAuthStore = defineStore(
  'auth',
  () => {
    const router = useRouter()

    // ── State ─────────────────────────────────────────────────────────────────
    const identity = ref<Identity | null>(null)
    const accessToken = ref<string | null>(null)
    const refreshToken = ref<string | null>(null)
    const isDevmode = ref(import.meta.env.VITE_APP_DEV_MODE === 'true')

    // ── Getters ───────────────────────────────────────────────────────────────
    const isAuthenticated = computed(() => !!accessToken.value && !!identity.value)

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
        else if (response.data.status == 402)
          await globalUtil.activeDialog(lang?.disabledUser, response.data.message, undefined, 1)
      }
      accessToken.value = response.data.object.tokens.accessToken
      refreshToken.value = response.data.object.tokens.refreshToken
      identity.value = response.data.object.user
      setTimeout(() => {
        window.location.reload()
      }, 200)
      await router.push('/')
    }

    /**
     * Called automatically by the Axios interceptor when a 401 is received.
     * Returns the new access token so the interceptor can retry the request.
     */
    async function refresh(): Promise<string> {
      const response = await http.post<{ object: string }>('/auth/refresh/access')
      accessToken.value = response.data.object
      return accessToken.value
    }

    /**
     * Clears all state and sends the user to the login page.
     */
    function logout(): void {
      identity.value = null
      accessToken.value = null
      refreshToken.value = null
      setTimeout(() => {
        window.location.reload()
      }, 50)
      router.push('/login')
    }

    async function updateRefreshToken() {
      const resp = await http.get<{ status: number; message: string; object: string }>(
        '/api/auth/refresh/refresh',
      )
      if (resp.data.status === 200) {
        refreshToken.value = resp.data.object
      } else {
        accessToken.value = null
        refreshToken.value = null
        identity.value = null
        refreshToken.value = resp.data.object
        throw new Error('Refresh token failed to update')
      }
    }

    return {
      identity,
      accessToken,
      refreshToken,
      isAuthenticated,
      isDevmode,
      login,
      refresh,
      logout,
      updateRefreshToken,
    }
  },
  {
    // pinia-plugin-persistedstate: only persist the tokens and identity.
    // The access token is short-lived but we persist it so the user
    // survives a page refresh within the active session.
    persist: {
      pick: ['accessToken', 'refreshToken', 'identity'],
    },
  },
)
