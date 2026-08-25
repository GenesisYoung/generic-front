/**
 * Authentication domain config: permission codes and the identity/token
 * shapes persisted for the current browser session. Kept in sync with the backend's
 * Permission table (codes 1001–1009).
 */

// Branded string type: a plain string cannot be assigned where an
// ISODateString is expected — it must go through toISODateString().
type ISODateString = string & { readonly _brand: 'ISODateString' }
/** User information */
type User = {
  id: string
  name: string
}
/** Permission levels */
enum Permission {
  ROOT = 1001,
  ACCOUNTANT = 1002,
  HR = 1003,
  MARKETING = 1004,
  PURCHASER = 1005,
  SALESMAN = 1006,
  BRAND_MANAGER = 1007,
  DESIGNER = 1008,
  CUSTOMER_RELATION = 1009,
}
/** Identity information stored for the current browser session. */
type Identity = {
  user: User
  permission: Permission[]
  status: boolean
}
/** Converts a Date to the branded ISO-8601 string type. */
function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString
}

export type { Identity, ISODateString }
export { Permission }
export { toISODateString }
