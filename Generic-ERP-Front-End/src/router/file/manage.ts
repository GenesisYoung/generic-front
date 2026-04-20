import { Permission } from '@/assets/config/auth'

type Route = import('vue-router').RouteRecordRaw

const manage: Route[] = [
  {
    path: '/manage/users',
    name: 'userManagement',
    component: () => import('@/views/manager/UserManage.vue'),
    meta: {
      requireAuth: true,
      permission: Permission.ROOT,
    },
  },
  {
    path: '/manage/roles',
    name: 'roleManagement',
    component: () => import('@/views/manager/RoleManage.vue'),
    meta: {
      requireAuth: true,
      permission: Permission.ROOT,
    },
  },
]

export default manage
