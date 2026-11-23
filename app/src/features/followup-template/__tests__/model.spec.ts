// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysLabel,
  emptyTemplateForm,
  everyNDays,
  formFrom,
  overdueLabel,
  previewTasks,
  stageTaskStartDays,
  toTemplateRequest,
  toggleDay,
  validateTemplate,
  type FollowUpTemplate,
} from '../model'

const builtIn: FollowUpTemplate = {
  id: 1,
  name: 'Default',
  materialNote: null,
  productionDays: 28,
  notifyDays: [],
  overduePeriodDays: 1,
  isDefault: true,
  dayBased: false,
  stages: [
    { stage: 'INITIAL', startDay: 1, endDay: 14, periodDays: 7, checksPerPeriod: 2 },
    { stage: 'INTENSIFIED', startDay: 15, endDay: 21, periodDays: 2, checksPerPeriod: 1 },
    { stage: 'DAILY', startDay: 22, endDay: 28, periodDays: 1, checksPerPeriod: 1 },
  ],
  activeOrders: 4,
}

describe('follow-up template model', () => {
  it('plans one task per notification day, the last one to the end of the period', () => {
    expect(previewTasks([20, 3, 10, 3], 30)).toEqual([
      { seq: 1, fromDay: 3, toDay: 9 },
      { seq: 2, fromDay: 10, toDay: 19 },
      { seq: 3, fromDay: 20, toDay: 30 },
    ])
    expect(previewTasks([5], null)).toEqual([{ seq: 1, fromDay: 5, toDay: 5 }])
    expect(previewTasks([], 30)).toEqual([])
  })

  it('fills every N days and toggles single days', () => {
    expect(everyNDays(30, 7)).toEqual([7, 14, 21, 28])
    expect(everyNDays(30, 0)).toEqual([])
    expect(toggleDay([3, 10], 5)).toEqual([3, 5, 10])
    expect(toggleDay([3, 5, 10], 5)).toEqual([3, 10])
  })

  it('gives the built-in stages the same tasks as day-based days', () => {
    expect(stageTaskStartDays(builtIn.stages)).toEqual([
      1, 4, 8, 11, 15, 17, 19, 21, 22, 23, 24, 25, 26, 27, 28,
    ])
    const form = formFrom(builtIn)
    expect(form.notifyDays).toHaveLength(15)
    expect(previewTasks(form.notifyDays, 28)[0]).toEqual({ seq: 1, fromDay: 1, toDay: 3 })
  })

  it('checks the form with the backend limits, in the UI language', () => {
    const ok = { ...emptyTemplateForm(), name: '铸件', notifyDays: [3, 10] }
    expect(validateTemplate(ok)).toBe('')
    expect(validateTemplate({ ...ok, name: ' ' })).toContain('模板名称')
    expect(validateTemplate({ ...ok, productionDays: 0 })).toContain('生产周期')
    expect(validateTemplate({ ...ok, notifyDays: [] })).toContain('通知日')
    expect(validateTemplate({ ...ok, notifyDays: [31] })).toContain('第 30 天')
    expect(validateTemplate({ ...ok, overduePeriodDays: 31 })).toContain('逾期')
    expect(validateTemplate({ ...ok, overduePeriodDays: 0 })).toBe('')
  })

  it('builds the request and the labels', () => {
    const form = {
      ...emptyTemplateForm(),
      name: ' 铸件 ',
      materialNote: ' ',
      notifyDays: [10, 3, 3],
    }
    expect(toTemplateRequest(form)).toEqual({
      name: '铸件',
      materialNote: null,
      productionDays: 30,
      notifyDays: [3, 10],
      overduePeriodDays: 1,
    })
    expect(overdueLabel(2)).toContain('2')
    expect(overdueLabel(0)).toBe('不再提醒')
    expect(daysLabel({ ...builtIn, dayBased: true, notifyDays: [3, 10] })).toBe('2 次：第 3, 10 天')
    expect(addDays(new Date(2026, 10, 30), 2)).toBe('2026-12-02')
  })
})
