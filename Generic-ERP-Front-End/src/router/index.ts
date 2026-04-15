import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import manage from './file/manage'

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
})

export default router
