import http from '@/api/http'
import type { Identity, TokenPair } from '@/types/auth'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

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
      const response = await http.post<{ object: { tokens: TokenPair; user: Identity } }>(
        '/auth/login',
        {
          username,
          password,
        },
      )
      if (response.status !== 200) {
        throw new Error('Login failed')
      }
      accessToken.value = response.data.object.tokens.accessToken
      refreshToken.value = response.data.object.tokens.refreshToken
      identity.value = response.data.object.user

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
      router.push('/login')
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
