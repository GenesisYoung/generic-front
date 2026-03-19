type Route = import('vue-router').RouteRecordRaw

const home: Route[] = [
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/HomePage.vue'),
  },
]

export default home
