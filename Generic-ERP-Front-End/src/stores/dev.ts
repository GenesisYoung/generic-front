import { defineStore } from 'pinia'
import { Permission, type AuthToken, type ISODateString } from '@/src/config/auth'
import { useAuthStore } from './auth'
import type { Identity } from '@/types/auth'

export const useDevStore = defineStore('dev', () => {
  // States of the dev store
  const devMode = import.meta.env.VITE_APP_DEV_MODE === 'true'
  const authStore = useAuthStore()
  /**
   * This function is used to create a user, it is only used for testing, it will be removed in the future.
   * */
  function initialUser() {
    const identity: Identity = {
      username: 'dev_user',
      id: 0,
      roles: [
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
    }
    const token: AuthToken = {
      accessToken: 'fake-access-token',
      refreshToken: 'fake-refresh-token',
      expireTime: new Date(Date.now() + 60 * 60 * 24 * 8 * 1000).toISOString() as ISODateString,
    }
    authStore.identity = identity
    authStore.accessToken = token.accessToken
    authStore.refreshToken = token.refreshToken
  }
  return {
    devMode,
    initialUser,
  }
})
