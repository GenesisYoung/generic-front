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
    path: '/permission/management',
    name: 'roleManagement',
    component: () => import('@/views/manage/PermissionManage.vue'),
    redirect: '/permission/management/permissions',
    meta: {
      requireAuth: true,
      permission: Permission.ROOT,
    },
    children: [
      {
        path: 'actions',
        name: 'actionList',
        component: () => import('@/views/manage/ActionList.vue'),
        meta: {
          requireAuth: true,
          permission: Permission.ROOT,
        },
      },
      {
        path: 'permissions',
        name: 'permissionList',
        component: () => import('@/views/manage/PermissionList.vue'),
        meta: {
          requireAuth: true,
          permission: Permission.ROOT,
        },
      },
      {
        path: 'menus',
        name: 'menuList',
        component: () => import('@/views/manage/MenuList.vue'),
        meta: {
          requireAuth: true,
          permission: Permission.ROOT,
        },
      },
    ],
  },
]

export default manage
