/**
 * Route definitions for the management module (/manage/*, /user/permission/*,
 * /permission/management/*). Imported and spread into the root router.
 *
 * Every route is lazy-loaded (dynamic import) so each management page is
 * split into its own chunk. `meta.permission` declares the permission code
 * required to access the route (checked against the user's identity).
 */
import { Permission } from '@/assets/config/auth'

type Route = import('vue-router').RouteRecordRaw

const manage: Route[] = [
  // User CRUD table — ROOT only.
  {
    path: '/manage/users',
    name: 'userManagement',
    component: () => import('@/views/manage/UserManage.vue'),
    meta: {
      requireAuth: true,
      permission: Permission.ROOT,
    },
  },
  // Permission allocation — two child views offering the same data from
  // opposite angles: "by user" (what can this user do?) and "by permission"
  // (who holds this permission?). Defaults to the by-user view.
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
      {
        path: 'defaults',
        name: 'defaultPermissionAlloc',
        component: () => import('@/views/manage/view/DefaultPermissionAlloc.vue'),
        meta: {
          requireAuth: true,
        },
      },
    ],
  },
  // Permission management console — child tabs for actions, permissions,
  // and navigation menus. Defaults to the permission list. ROOT only.
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
