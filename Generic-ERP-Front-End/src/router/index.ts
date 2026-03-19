import { createRouter, createWebHistory } from 'vue-router'
import account from './file/account'
import home from './file/home'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...account,
    {
      name: 'Main Entry',
      path: '/',
      component: () => import('@/views/MainEntry.vue'),
      children: [...home],
    },
    {
      path: '/:catchAll(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound.vue'),
    },
  ],
})

export default router
