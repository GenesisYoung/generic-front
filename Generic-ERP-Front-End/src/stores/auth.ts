import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import http from '@/api/http'
import type { Identity, TokenPair } from '@/types/auth'
import { toISODateString } from '@/assets/config/auth'
import type { AuthToken } from '@/assets/config/auth'

export const useAuthStore = defineStore(
  'auth',
  () => {
    const router = useRouter()

    // ── State ─────────────────────────────────────────────────────────────────
    const identity = ref<Identity | null>(null)
    const accessToken = ref<string | null>(null)
    const refreshToken = ref<string | null>(null)
    const isDevmode = ref(import.meta.env.VITE_APP_DEV_MODE === 'true') && ref(import.meta.env.DEV)

    console.log('Auth store initialized. Dev mode:', isDevmode.value)

    // ── Getters ───────────────────────────────────────────────────────────────
    const isAuthenticated = computed(() => !!accessToken.value && !!identity.value)

    function hasRole(role: number): boolean {
      return identity.value?.roles.includes(role) ?? false
    }

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * Called when the user submits the login form.
     * The backend returns an access token, a refresh token, and user identity.
     */
    async function login(username: string, password: string): Promise<void> {
      const response = await http.post<{ tokens: TokenPair; identity: Identity }>('/auth/login', {
        username,
        password,
      })

      if (response.status !== 200) {
        throw new Error('Login failed')
      }

      accessToken.value = response.data.tokens.accessToken
      refreshToken.value = response.data.tokens.refreshToken
      identity.value = response.data.identity

      await router.push('/')
    }

    /**
     * Called automatically by the Axios interceptor when a 401 is received.
     * Sends the refresh token to get a new access token.
     * Returns the new access token so the interceptor can retry the request.
     */
    async function refresh(): Promise<string> {
      const response = await http.post<{ accessToken: string }>('/auth/refresh', {
        refreshToken: refreshToken.value,
      })

      accessToken.value = response.data.accessToken
      return response.data.accessToken
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
    const dev_user_roles = import.meta.env.VITE_APP_DEV_USER_ROLES?.split(',').map(Number)
    const dev: Identity = {
      username: 'dev_user',
      id: 0,
      roles: dev_user_roles,
    }
    const token: AuthToken = {
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      expireTime: toISODateString(new Date(Date.now() + 60 * 60 * 24 * 8 * 1000)),
    }
    if (isDevmode.value) {
      identity.value = dev
      accessToken.value = token.accessToken
      refreshToken.value = token.refreshToken
    }

    return {
      identity,
      accessToken,
      refreshToken,
      isAuthenticated,
      isDevmode,
      hasRole,
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
