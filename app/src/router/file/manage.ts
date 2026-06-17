import { Permission } from '@/assets/config/auth'

type Route = import('vue-router').RouteRecordRaw

const manage: Route[] = [
  {
    path: '/manage/users',
    name: 'userManagement',
    component: () => import('@/views/manage/UserManage.vue'),
    meta: {
      requireAuth: true,
      permission: Permission.ROOT,
    },
  },
  {
    path: '/manage/roles',
    name: 'roleManagement',
    component: () => import('@/views/manage/RoleManage.vue'),
    redirect: '/manage/roles/list',
    meta: {
      requireAuth: true,
      permission: Permission.ROOT,
    },
    children: [
      {
        path: 'list',
        name: 'roleList',
        component: () => import('@/views/manage/RoleList.vue'),
        meta: {
          requireAuth: true,
          permission: Permission.ROOT,
        },
      },
      {
        path: 'distribute',
        name: 'roleDistribute',
        component: () => import('@/views/manage/RoleDistribute.vue'),
        meta: {
          requireAuth: true,
          permission: Permission.ROOT,
        },
      },
    ],
  },
]

export default manage
