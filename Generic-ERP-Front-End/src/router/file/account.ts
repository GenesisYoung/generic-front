type Route = import('vue-router').RouteRecordRaw

const account: Route[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/UserLogin.vue'),
  },
]

export default account
