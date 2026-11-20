// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildPermissionTree, nodeRecordIds, toggleRecords } from '../tree'
describe('permission trees without a fixed depth', () => {
  it('merges common prefixes and keeps read/create/configure as separate levels', () => {
    const tree = buildPermissionTree([
      { id: 112, permissionCode: 'menu.evidence.read' },
      { id: 113, permissionCode: 'menu.evidence.create' },
      { id: 120, permissionCode: 'menu.order-audit-task.rules.configure' },
    ])
    expect(tree).toHaveLength(1)
    const root = tree[0]!
    expect(root.records).toEqual([])
    expect(root.children.map((n) => n.label)).toEqual(['evidence', 'order-audit-task'])
    expect(root.children[0]!.children.map((n) => n.label)).toEqual(['read', 'create'])
    expect(root.children[1]!.children[0]!.children[0]).toMatchObject({
      label: 'configure',
      code: 'menu.order-audit-task.rules.configure',
      records: [{ id: 120, permissionCode: 'menu.order-audit-task.rules.configure' }],
    })
  })
  it('supports many levels, not just three or four', () => {
    const parts = Array.from({ length: 32 }, (_, i) => `level${i}`)
    let node = buildPermissionTree([{ id: 1, permissionCode: parts.join('.') }])[0]!
    for (let i = 0; i < parts.length; i++) {
      expect(node.label).toBe(parts[i])
      if (i < parts.length - 1) node = node.children[0]!
    }
    expect(node.records[0]?.id).toBe(1)
  })
  it('retains real parent records even if children occur first and preserves root-only permissions', () => {
    const tree = buildPermissionTree([
      { id: 3, permissionCode: 'menu.evidence.read' },
      { id: 2, permissionCode: 'menu.evidence' },
      { id: 1, permissionCode: 'menu' },
      { id: 4, permissionCode: 'product' },
    ])
    expect(tree[0]!.records[0]?.id).toBe(1)
    expect(tree[0]!.children[0]!.records[0]?.id).toBe(2)
    expect(tree[1]!.records[0]?.id).toBe(4)
    expect(nodeRecordIds(tree[0]!).sort()).toEqual([1, 2, 3])
  })
  it('never invents record IDs for missing ancestors or includes unseen pages', () => {
    const node = buildPermissionTree([{ id: 112, permissionCode: 'menu.evidence.read' }])[0]!
    expect(nodeRecordIds(node)).toEqual([112])
    expect(toggleRecords([], nodeRecordIds(node), true)).toEqual([112])
  })
  it('keeps exact segment boundaries, repeated labels, duplicate code records and malformed legacy rows', () => {
    const tree = buildPermissionTree([
      { id: 1, permissionCode: 'a.b.read' },
      { id: 2, permissionCode: 'a.bc.read' },
      { id: 3, permissionCode: 'a.b.read' },
      { id: 4, permissionCode: 'a..b' },
      { id: 5, permissionCode: '' },
    ])
    expect(tree[0]!.children.map((n) => n.label)).toEqual(['b', 'bc'])
    expect(tree[0]!.children[0]!.children[0]!.records.map((r) => r.id)).toEqual([1, 3])
    expect(tree[1]!.code).toBe('a..b')
    expect(tree[2]!.records[0]?.id).toBe(5)
  })
  it('toggles actual IDs without losing other selections or adding duplicates', () => {
    expect(toggleRecords([1, 5], [1, 2, 2], true)).toEqual([1, 5, 2])
    expect(toggleRecords([1, 5, 2], [1, 2], false)).toEqual([5])
  })
})
