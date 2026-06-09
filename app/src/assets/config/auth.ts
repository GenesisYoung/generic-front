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
/** Identity information stored in localStorage, including user information, permissions and login status */
type Identity = {
  user: User
  permission: Permission[]
  status: boolean
}
/** Authentication Token stored in localStorage, including access token, refresh token and expiration time */
type AuthToken = {
  accessToken: string
  refreshToken: string
  expireTime: ISODateString
}

function toISODateString(date: Date): ISODateString {
  return date.toISOString() as ISODateString
}

export type { Identity, AuthToken, ISODateString }
export { Permission }
export { toISODateString }
