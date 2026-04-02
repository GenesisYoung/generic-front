import { createRouter, createWebHistory } from 'vue-router'
import account from './file/account'
import home from './file/home'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...account,
    {
      name: 'Main Entry',
      path: '/',
      component: () => import('@/views/MainEntry.vue'),
      children: [...home],
      meta: {
        requireAuth: true,
      },
    },
    {
      path: '/:catchAll(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound.vue'),
      meta: {
        requireAuth: false,
      },
    },
  ],
})

router.beforeEach((to, from, next) => {
  if (to.meta.requireAuth) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      next()
    } else {
      next('/login')
    }
  } else {
    next()
  }
})

export default router
