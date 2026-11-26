// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  bomStatusLabel,
  boughtLabel,
  checkColor,
  feeLabel,
  fileNameFrom,
  money,
  normalizeSettings,
  percent,
  validateSettings,
  type QuotationSettings,
} from '../model'

function settings(extra: Partial<QuotationSettings> = {}): QuotationSettings {
  return {
    fees: [{ code: 'TAX', base: 'PRICE', ratePercent: 6, enabled: true }],
    marginTiers: [
      { minAmount: 0, ratePercent: 15 },
      { minAmount: 3000, ratePercent: 10 },
    ],
    priceCheckLow: 0.8,
    priceCheckHigh: 1.2,
    ...extra,
  }
}

describe('quotation model', () => {
  it('labels and formats', () => {
    expect(bomStatusLabel('NONE')).toBe('无BOM')
    expect(boughtLabel({ planLines: 4, planLinesBought: 0 })).toBe('未采购')
    expect(boughtLabel({ planLines: 4, planLinesBought: 1 })).toBe('已采购 1/4 行')
    expect(boughtLabel({ planLines: 0, planLinesBought: 0 })).toBe('—')
    expect(feeLabel('MANAGEMENT')).toBe('管理费')
    expect(checkColor('HIGH')).toBe('error')
    expect(checkColor('NO_BASE')).toBeUndefined()
    expect(money(1234.5)).toBe('1,234.50')
    expect(money(null)).toBe('—')
    expect(percent(2.5)).toBe('2.5%')
  })

  it('validates the settings form', () => {
    expect(validateSettings(settings())).toBe('')
    expect(validateSettings(settings({ marginTiers: [] }))).toContain('至少')
    expect(
      validateSettings(
        settings({
          marginTiers: [
            { minAmount: 1000, ratePercent: 15 },
            { minAmount: 1000, ratePercent: 10 },
          ],
        }),
      ),
    ).toContain('相同')
    expect(
      validateSettings(
        settings({ fees: [{ code: 'TAX', base: 'PRICE', ratePercent: 120, enabled: true }] }),
      ),
    ).toContain('100%')
  })

  it('turns typed text into sorted numbers', () => {
    const s = normalizeSettings(
      settings({
        marginTiers: [
          { minAmount: '3000' as unknown as number, ratePercent: 10 },
          { minAmount: 0, ratePercent: '15' as unknown as number },
        ],
      }),
    )
    expect(s.marginTiers).toEqual([
      { minAmount: 0, ratePercent: 15 },
      { minAmount: 3000, ratePercent: 10 },
    ])
  })

  it('reads the download file name', () => {
    expect(
      fileNameFrom(
        `attachment; filename="quotation.xlsx"; filename*=UTF-8''%E6%8A%A5%E4%BB%B7_26394-W53.xlsx`,
        'x.xlsx',
      ),
    ).toBe('报价_26394-W53.xlsx')
    expect(fileNameFrom('attachment; filename="a.xlsx"', 'x.xlsx')).toBe('a.xlsx')
    expect(fileNameFrom(undefined, 'x.xlsx')).toBe('x.xlsx')
  })
})
