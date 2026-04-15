type Route = import('vue-router').RouteRecordRaw

const manage: Route[] = [
  {
    path: '/manage/users',
    name: 'Users',
    component: () => import('@/views/manager/UserManage.vue'),
    meta: {
      requireAuth: true,
    },
  },
]

export default manage
