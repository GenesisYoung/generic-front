/**
 * Route definitions for the management module (/manage/*, /user/permission/*,
 * /permission/management/*). Imported and spread into the root router.
 *
 * Every route is lazy-loaded (dynamic import) so each management page is
 * split into its own chunk. `meta.permission` lists permission codes, any one
 * of which grants access (checked by the guard in router/index.ts). They match
 * the codes the backend requires for the endpoints each screen calls.
 */
import { Perm } from '@/assets/config/auth'
import { useAuthStore } from '@/stores/auth'

type Route = import('vue-router').RouteRecordRaw

const manage: Route[] = [
  // User CRUD table.
  {
    path: '/manage/users',
    name: 'userManagement',
    component: () => import('@/views/manage/UserManage.vue'),
    meta: {
      requireAuth: true,
      permission: [Perm.users.read],
    },
  },
  // Department management (department ↔ role).
  {
    path: '/manage/departments',
    name: 'departmentManagement',
    component: () => import('@/views/manage/DepartmentManage.vue'),
    meta: {
      requireAuth: true,
      permission: [Perm.departments.read],
    },
  },
  // Permission allocation — two child views offering the same data from
  // opposite angles: "by user" (what can this user do?) and "by permission"
  // (who holds this permission?), plus role defaults. Opens the first child
  // the user may see.
  {
    path: '/user/permission/allocation',
    name: 'userPermissionAllocation',
    component: () => import('@/views/manage/PermissionAllocation.vue'),
    redirect: () =>
      useAuthStore().can(Perm.permissions.read)
        ? '/user/permission/allocation/user'
        : '/user/permission/allocation/defaults',
    meta: {
      requireAuth: true,
      permission: [Perm.permissions.read, Perm.roles.read],
    },
    children: [
      {
        path: 'user',
        name: 'throughUser',
        component: () => import('@/views/manage/view/UserPermission.vue'),
        meta: {
          requireAuth: true,
          permission: [Perm.permissions.read],
        },
      },
      {
        path: 'permission',
        name: 'throughPermission',
        component: () => import('@/views/manage/view/ThroughPermission.vue'),
        meta: {
          requireAuth: true,
          permission: [Perm.permissions.read],
        },
      },
      {
        path: 'defaults',
        name: 'roleList',
        component: () => import('@/views/manage/view/DefaultPermissionAlloc.vue'),
        meta: {
          requireAuth: true,
          permission: [Perm.roles.read],
        },
      },
    ],
  },
  // Permission management console — child tabs for actions, permissions,
  // and navigation menus. Opens the first child the user may see.
  {
    path: '/permission/management',
    name: 'roleManagement',
    component: () => import('@/views/manage/PermissionManage.vue'),
    redirect: () =>
      useAuthStore().can(Perm.permissions.read)
        ? '/permission/management/permissions'
        : '/permission/management/menus',
    meta: {
      requireAuth: true,
      permission: [Perm.permissions.read, Perm.menus.read],
    },
    children: [
      {
        path: 'actions',
        name: 'actionList',
        component: () => import('@/views/manage/view/ActionList.vue'),
        meta: {
          requireAuth: true,
          permission: [Perm.permissions.read],
        },
      },
      {
        path: 'permissions',
        name: 'permissionList',
        component: () => import('@/views/manage/view/PermissionList.vue'),
        meta: {
          requireAuth: true,
          permission: [Perm.permissions.read],
        },
      },
      {
        path: 'menus',
        name: 'menuList',
        component: () => import('@/views/manage/view/MenuList.vue'),
        meta: {
          requireAuth: true,
          permission: [Perm.menus.read],
        },
      },
    ],
  },
]

export default manage
