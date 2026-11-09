/**
 * Authentication domain config: the permission codes the backend checks on
 * every endpoint (see the backend's PermissionChecker and
 * V3__api_permission_seed.sql), and the shapes persisted for the session.
 *
 * Codes are hierarchical: holding `menu.userManagement` grants every code
 * beneath it (`menu.userManagement.read`, `.create`, ...). ROOT passes every
 * check. The UI uses these only to hide what the backend would refuse anyway.
 */

// Branded string type: a plain string cannot be assigned where an
// ISODateString is expected — it must go through toISODateString().
type ISODateString = string & { readonly _brand: 'ISODateString' }

type Crud = { read: string; create: string; update: string; delete: string }

function crud(resource: string): Crud {
  return {
    read: `${resource}.read`,
    create: `${resource}.create`,
    update: `${resource}.update`,
    delete: `${resource}.delete`,
  }
}

/** Permission codes, mirroring the backend's @PreAuthorize expressions. */
const Perm = {
  users: crud('menu.userManagement'),
  departments: crud('menu.departmentManagement'),
  roles: crud('menu.roleManagement'),
  menus: crud('menu.menuManagement'),
  permissions: crud('menu.permissionManagement'),
  product: { ...crud('product'), import: 'product.import' },
} as const

/** The caller's effective permissions, as returned by GET /api/users/permissions. */
type PermissionSet = {
  root: boolean
  codes: string[]
}

/**
 * Same rule as the backend: ROOT passes; otherwise the caller needs the exact
 * code or one of its ancestors (`a.b` grants `a.b.c`, but `a.b` does not grant
 * `a.bc`).
 */
function hasPermission(set: PermissionSet | null, code: string): boolean {
  if (!set) return false
  if (set.root) return true
  return set.codes.some((granted) => code === granted || code.startsWith(`${granted}.`))
}

/** Authentication Token stored in localStorage, including access token and expiration time */
type AuthToken = {
  accessToken: string
  expireTime: ISODateString
}

/** Converts a Date to the branded ISO-8601 string type. */
function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString
}

export { hasPermission, Perm, toISODateString }
export type { AuthToken, ISODateString, PermissionSet }
