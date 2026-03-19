import { defineStore } from 'pinia'
import { Permission, type Identity, type AuthToken, type ISODateString } from '@/src/config/auth'
import { useAuthStore } from './authStore'

export const useDevStore = defineStore('dev', () => {
  // States of the dev store
  const devMode = import.meta.env.VITE_APP_DEV_MODE === 'true'
  const authStore = useAuthStore()
  /**
   * This function is used to create a user, it is only used for testing, it will be removed in the future.
   * */
  function initialUser() {
    const identity: Identity = {
      user: {
        name: 'Genesis Young',
        id: 'dev-user-id',
      },
      permission: [
        Permission.ROOT,
        Permission.ACCOUNTANT,
        Permission.HR,
        Permission.MARKETING,
        Permission.PURCHASER,
        Permission.SALESMAN,
        Permission.BRAND_MANAGER,
        Permission.DESIGNER,
        Permission.CUSTOMER_RELATION,
      ],
      status: true,
    }
    const token: AuthToken = {
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      expireTime: new Date(Date.now() + 60 * 60 * 24 * 8 * 1000).toISOString() as ISODateString,
    }
    localStorage.setItem('identity_dev', JSON.stringify(identity))
    localStorage.setItem('token_dev', JSON.stringify(token))
    authStore.setIdentity(identity)
    authStore.setToken(token)
  }
  return {
    devMode,
    initialUser,
  }
})
