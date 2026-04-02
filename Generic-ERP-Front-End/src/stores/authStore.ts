import { defineStore } from 'pinia'
import type { Identity, AuthToken, ISODateString } from '@/src/config/auth'
import { computed, ref, readonly } from 'vue'
export const useAuthStore = defineStore('auth', () => {
  const dev_mode = import.meta.env.VITE_APP_DEV_MODE === 'true'
  // States of the auth store
  const identity = ref<Identity | null>(null)
  const token = ref<AuthToken | null>(null)
  if (!dev_mode) {
    console.log('dev', dev_mode)
    const identity_raw = localStorage.getItem('identity')
    const token_raw = localStorage.getItem('token')
    identity.value = identity_raw ? (JSON.parse(identity_raw) as Identity) : null
    token.value = token_raw ? (JSON.parse(token_raw) as AuthToken) : null
    console.log('Running in production mode, loading identity and token from localStorage')
  } else {
    console.log('dev', dev_mode)
    localStorage.removeItem('identity')
    localStorage.removeItem('token')
    const identity_raw = localStorage.getItem('identity_dev')
    const token_raw = localStorage.getItem('token_dev')
    identity.value = identity_raw ? (JSON.parse(identity_raw) as Identity) : null
    token.value = token_raw ? (JSON.parse(token_raw) as AuthToken) : null
    console.log('Running in development mode, loading identity and token from localStorage (dev)')
  }
  // Getters of the auth store
  // Getters for user information and permissions
  const userName = computed(() => identity?.value?.user.name || '')
  const userId = computed(() => identity?.value?.user.id || '')
  const permissions = computed(() => identity?.value?.permission || [])
  // Getters for authentication status
  const loginStatus = computed(() => identity?.value?.status || false)
  const isAuthenticated = computed(() => loginStatus.value && token.value !== null)
  // Actions of the auth store
  /**
   * Update User's information and permissions
   * @param newIdentity User's information and permissions, or null to clear the identity
   */
  function setIdentity(newIdentity: Identity | null) {
    identity.value = newIdentity
    if (newIdentity) {
      localStorage.setItem(dev_mode ? 'identity_dev' : 'identity', JSON.stringify(newIdentity))
    } else {
      localStorage.removeItem('identity')
      localStorage.removeItem('identity_dev')
    }
  }
  /**
   * Update Authentication Token
   * @param newToken Authentication Token, or null to clear the token
   */
  function setToken(newToken: AuthToken | null) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem(dev_mode ? 'token_dev' : 'token', JSON.stringify(newToken))
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('token_dev')
    }
  }
  // Action to clear identity and token on logout
  function logout() {
    setIdentity(null)
    setToken(null)
  }
  // Filter avaiable interfaces based on permissions
  function filterInterfacesByPermissions(
    interfaces: { name: string; requiredPermission: number }[],
  ) {
    return interfaces.filter((iface) => permissions.value.includes(iface.requiredPermission))
  }

  async function fetchNewRefreshToken(token: string): Promise<string> {
    return new Promise((resolve) => {
      // TODO: Implement the actual API call to refresh the token using the provided token
      resolve('new_token')
    })
  }
  async function checkAndRefreshToken() {
    const lifetime: number = new Date(token?.value?.expireTime || '').getTime() - Date.now()
    if (lifetime <= 60 * 60 * 24 * 1000) {
      // Refresh token if it's about to expire within 24 hours
      const newToken = await fetchNewRefreshToken(token?.value?.refreshToken || '')
      setToken({
        accessToken: newToken,
        refreshToken: token?.value?.refreshToken || '',
        expireTime: new Date(Date.now() + 60 * 60 * 24 * 8 * 1000).toISOString() as ISODateString, // Set new expiration time to 8 days from now
      })
    } else {
      // Set a timer to refresh the token 24 hours before it expires
      setTimeout(refreshTokenTimer, lifetime - 60 * 60 * 24 * 1000)
    }
  }
  function refreshTokenTimer() {
    checkAndRefreshToken()
  }
  return {
    identity: readonly(identity),
    token: readonly(token),
    userName,
    userId,
    permissions,
    loginStatus,
    isAuthenticated,
    setIdentity,
    setToken,
    logout,
    checkAndRefreshToken,
    filterInterfacesByPermissions,
  }
})
