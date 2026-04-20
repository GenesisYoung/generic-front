import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import manage from './file/manage'
import { useTabsStore } from '@/stores/tabs'
import type { Tab } from '@/types/interface'
import { lan } from '@/lang/china_zh'
type Lan = Record<string, string>
const mapping: Lan = lan

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      alias: '/dashboard',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { requiresAuth: true },
    },
    ...manage,
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const tabs = useTabsStore()
  if (!auth.isDevmode && to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // If the user is already logged in and tries to visit /login, redirect home.
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' }
  }

  if (auth.isDevmode && to.name === 'login') {
    return { name: 'home' }
  }
  const newTab: Tab = {
    id: to.fullPath,
    title: mapping[to.name as string] || (to.name as string) || to.fullPath,
    component: () => import('@/views' + to.path + '.vue'),
    router: to.fullPath,
  }
  tabs.addTab(newTab)
})

export default router
