type Route = import('vue-router').RouteRecordRaw

const account: Route[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: {
      requireAuth: false,
    },
  },
]

export default account
