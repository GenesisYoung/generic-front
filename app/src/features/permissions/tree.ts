export interface PermissionRecord {
  id: number
  permissionCode: string
}
export interface PermissionNode {
  key: string
  label: string
  code: string
  records: PermissionRecord[]
  children: PermissionNode[]
}
/** Missing ancestors are display groups, never invented database records. */
export function buildPermissionTree(records: PermissionRecord[]): PermissionNode[] {
  const roots: PermissionNode[] = []
  const nodes = new Map<string, PermissionNode>()
  for (const record of records) {
    const parts = record.permissionCode.split('.')
    // Preserve malformed legacy codes verbatim instead of merging distinct IDs.
    if (parts.some((p) => !p.trim())) {
      const key = `record:${record.id}`
      roots.push({
        key,
        label: record.permissionCode || '（空权限码）',
        code: record.permissionCode,
        records: [record],
        children: [],
      })
      continue
    }
    let siblings = roots,
      path = ''
    let current: PermissionNode | undefined
    for (const part of parts) {
      path = path ? `${path}.${part}` : part
      current = nodes.get(path)
      if (!current) {
        current = { key: `code:${path}`, label: part, code: path, records: [], children: [] }
        nodes.set(path, current)
        siblings.push(current)
      }
      siblings = current.children
    }
    if (current && !current.records.some((r) => r.id === record.id)) current.records.push(record)
  }
  return roots
}
export function nodeRecordIds(node: PermissionNode): number[] {
  const ids = new Set<number>(),
    pending = [node]
  while (pending.length) {
    const current = pending.pop()!
    current.records.forEach((r) => ids.add(r.id))
    pending.push(...current.children)
  }
  return [...ids]
}
export function toggleRecords(selection: number[], ids: number[], selected: boolean): number[] {
  const values = new Set(selection)
  ids.forEach((id) => (selected ? values.add(id) : values.delete(id)))
  return [...values]
}
