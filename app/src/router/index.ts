/**
 * Root router (hash history, so no server-side routing config is needed).
 *
 * A global beforeEach guard enforces authentication for routes flagged with
 * `meta.requireAuth`, enforces `meta.permission` (any listed code grants access,
 * on the route and every parent), redirects logged-in users away from /login,
 * and opens every visited route as a tab in the multi-tab workspace.
 */
import { lan } from '@/lang/china_zh'
import { useAuthStore } from '@/stores/auth'
import { useTabsStore } from '@/stores/tabs'
import type { Tab } from '@/types/interface'
import { globalUtil } from '@/utils/util'
import { createRouter, createWebHashHistory } from 'vue-router'
import manage from './file/manage'
type Lan = Record<string, string>
const mapping: Lan = lan

declare module 'vue-router' {
  interface RouteMeta {
    requireAuth?: boolean
    /** Permission codes; holding any one of them grants access. */
    permission?: string[]
  }
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requireAuth: false },
    },
    {
      path: '/',
      alias: '/dashboard',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requireAuth: true },
    },
    ...manage,
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const tabs = useTabsStore()
  // debugger
  if (to.meta.requireAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Refresh permission codes once per page load before the first check.
  if (auth.isAuthenticated && !auth.permissionsLoaded) {
    await auth.loadPermissions()
  }
  const allowed = to.matched.every((record) => {
    const codes = record.meta.permission
    return !codes || codes.length === 0 || auth.canAny(...codes)
  })
  if (!allowed) {
    void globalUtil.activeDialog(mapping.noPermission, mapping.noPermissionContent, 'mdi-lock', 1)
    return { name: 'home' }
  }

  // If the user is already logged in and tries to visit /login, redirect home.
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' }
  }
  // Register the destination as a workspace tab (title resolved via i18n,
  // falling back to the route name / path).
  const newTab: Tab = {
    id: to.fullPath,
    title: mapping[to.name as string] || (to.name as string) || to.fullPath,
    component: () => import(`@/views/${to.path}.vue`),
    router: to.fullPath,
  }
  tabs.addTab(newTab)
})

export default router
