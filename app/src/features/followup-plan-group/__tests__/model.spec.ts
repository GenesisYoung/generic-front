// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  emptyGroupForm,
  groupFormFrom,
  groupNameOf,
  modeLabel,
  refreshMessage,
  toGroupRequest,
  typeLabel,
  validateGroup,
  type PlanGroup,
} from '../model'
import {
  filterBySeries,
  groupsInList,
  seriesLabel,
  type TodoItem,
} from '../../purchase-followup/model'

const group = (id: number, name: string, extra: Partial<PlanGroup> = {}): PlanGroup => ({
  id,
  name,
  separate: true,
  templateId: null,
  templateName: null,
  note: null,
  typeCodes: [],
  openOrders: 0,
  ...extra,
})

describe('plan group model', () => {
  it('validates the name, duplicates and the note', () => {
    const groups = [group(1, 'Hardware')]
    expect(validateGroup({ ...emptyGroupForm(), name: ' ' }, groups, null)).toContain('100')
    expect(validateGroup({ ...emptyGroupForm(), name: 'hardware' }, groups, null)).toContain(
      'hardware',
    )
    expect(validateGroup({ ...emptyGroupForm(), name: 'Hardware' }, groups, 1)).toBe('')
    expect(
      validateGroup({ ...emptyGroupForm(), name: 'X', note: 'n'.repeat(201) }, [], null),
    ).toContain('200')
  })

  it('builds the request and the edit form', () => {
    const g = group(3, 'Packaging', { separate: false, note: 'box', typeCodes: ['PK'] })
    const form = groupFormFrom(g)
    expect(form).toEqual({
      name: 'Packaging',
      separate: false,
      templateId: null,
      note: 'box',
      typeCodes: ['PK'],
    })
    form.typeCodes.push('BX')
    expect(g.typeCodes).toEqual(['PK'])
    expect(toGroupRequest({ ...form, name: ' P ', note: ' ' })).toEqual({
      name: 'P',
      separate: false,
      templateId: null,
      note: null,
      typeCodes: ['PK', 'BX'],
    })
  })

  it('labels types, groups, modes and results in the UI language', () => {
    expect(typeLabel({ code: 'HW', name: '五金' })).toBe('HW 五金')
    expect(typeLabel({ code: 'HW', name: null })).toBe('HW')
    expect(groupNameOf(null, [])).toBe('不分组（主任务）')
    expect(groupNameOf(1, [group(1, 'Hardware')])).toBe('Hardware')
    expect(modeLabel({ separate: true })).toBe('单独跟进')
    expect(modeLabel({ separate: false })).toBe('主任务')
    expect(refreshMessage({ orders: 12, seriesStarted: 3, seriesEnded: 1 })).toBe(
      '已检查 12 个进行中订单：新增 3 个跟进任务，结束 1 个',
    )
  })
})

describe('to-do series helpers', () => {
  const item = (id: number, planGroupId: number | null, planGroupName: string | null) =>
    ({ checkpointId: id, planGroupId, planGroupName }) as TodoItem
  const items = [item(1, null, null), item(2, 5, '五金'), item(3, 5, '五金'), item(4, 6, '包材')]

  it('lists the groups in the list and filters by them', () => {
    expect(groupsInList(items)).toEqual(
      [
        { id: 6, name: '包材', count: 1 },
        { id: 5, name: '五金', count: 2 },
      ].sort((a, b) => a.name.localeCompare(b.name)),
    )
    expect(filterBySeries(items, 'ALL')).toHaveLength(4)
    expect(filterBySeries(items, 'MAIN').map((i) => i.checkpointId)).toEqual([1])
    expect(filterBySeries(items, 5).map((i) => i.checkpointId)).toEqual([2, 3])
    expect(seriesLabel(items[0]!)).toBe('主任务')
    expect(seriesLabel(items[1]!)).toBe('五金')
    expect(seriesLabel({ planGroupId: 9, planGroupName: null })).toBe('分组 9')
  })
})
