type Route = import('vue-router').RouteRecordRaw

const home: Route[] = [
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
    meta: {
      requireAuth: true,
      requirePermission: 'home',
    },
  },
]

export default home
