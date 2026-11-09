import { describe, expect, it } from 'vitest'

import { hasPermission, Perm } from '@/assets/config/auth'

describe('hasPermission', () => {
  it('lets a parent code grant its children', () => {
    const set = { root: false, codes: ['menu.userManagement'] }
    expect(hasPermission(set, Perm.users.read)).toBe(true)
    expect(hasPermission(set, Perm.users.delete)).toBe(true)
    expect(hasPermission(set, Perm.roles.read)).toBe(false)
  })

  it('keeps a child code narrow', () => {
    const set = { root: false, codes: [Perm.users.read] }
    expect(hasPermission(set, Perm.users.read)).toBe(true)
    expect(hasPermission(set, Perm.users.update)).toBe(false)
  })

  it('only matches whole segments', () => {
    expect(hasPermission({ root: false, codes: ['menu.user'] }, Perm.users.read)).toBe(false)
  })

  it('lets ROOT pass and denies when nothing is loaded', () => {
    expect(hasPermission({ root: true, codes: [] }, Perm.product.import)).toBe(true)
    expect(hasPermission(null, Perm.users.read)).toBe(false)
  })
})
