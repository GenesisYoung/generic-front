// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { daysLeftLabel, emptyForm, toRequest, urgencyColor, validateForm } from '../model'

describe('follow-up model', () => {
  it('labels the deadline', () => {
    expect(daysLeftLabel(0)).toBe('今天截止')
    expect(daysLeftLabel(2)).toBe('剩 2 天')
  })

  it('marks today and the overdue stage as urgent', () => {
    expect(urgencyColor({ daysLeft: 0, stage: 'INITIAL' })).toBe('error')
    expect(urgencyColor({ daysLeft: 3, stage: 'OVERDUE' })).toBe('error')
    expect(urgencyColor({ daysLeft: 1, stage: 'DAILY' })).toBe('warning')
    expect(urgencyColor({ daysLeft: 2, stage: 'INITIAL' })).toBe('default')
  })

  it('requires a material status and a short note', () => {
    expect(validateForm(emptyForm())).toBe('请选择物料状态')
    expect(
      validateForm({ ...emptyForm(), materialStatus: 'ON_TRACK', note: 'x'.repeat(501) }),
    ).toContain('500')
    expect(
      validateForm({ ...emptyForm(), materialStatus: 'ON_TRACK', supplierPromisedDate: '12/01' }),
    ).toContain('YYYY-MM-DD')
    expect(validateForm({ ...emptyForm(), materialStatus: 'DELAYED' })).toBe('')
  })

  it('sends null for empty optional fields', () => {
    expect(toRequest({ ...emptyForm(), materialStatus: 'AT_RISK', note: '  ' })).toEqual({
      materialStatus: 'AT_RISK',
      supplierPromisedDate: null,
      missingOrderFound: false,
      note: null,
    })
  })
})
