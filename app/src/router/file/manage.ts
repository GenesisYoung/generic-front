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
    path: '/user/permission/allocation',
    name: 'userPermissionAllocation',
    component: () => import('@/views/manage/PermissionAllocation.vue'),
    redirect: '/user/permission/allocation/user',
    meta: {
      requireAuth: true,
    },
    children: [
      {
        path: 'user',
        name: 'throughUser',
        component: () => import('@/views/manage/view/UserPermission.vue'),
        meta: {
          requireAuth: true,
        },
      },
      {
        path: 'permission',
        name: 'throughPermission',
        component: () => import('@/views/manage/view/ThroughPermission.vue'),
        meta: {
          requireAuth: true,
        },
      },
    ],
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
        component: () => import('@/views/manage/view/ActionList.vue'),
        meta: {
          requireAuth: true,
          permission: Permission.ROOT,
        },
      },
      {
        path: 'permissions',
        name: 'permissionList',
        component: () => import('@/views/manage/view/PermissionList.vue'),
        meta: {
          requireAuth: true,
          permission: Permission.ROOT,
        },
      },
      {
        path: 'menus',
        name: 'menuList',
        component: () => import('@/views/manage/view/MenuList.vue'),
        meta: {
          requireAuth: true,
          permission: Permission.ROOT,
        },
      },
    ],
  },
]

export default manage
