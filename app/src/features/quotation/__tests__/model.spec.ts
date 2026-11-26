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
  offerLabel,
  parseManualPrice,
  percent,
  sourceLabel,
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
    expect(boughtLabel({ planLines: 0, planLinesBought: 0 })).toBe('无采购计划')
    expect(boughtLabel({ planLines: 3, planLinesBought: 3 })).toBe('已全部采购')
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

describe('price source labels', () => {
  it('names the source and, for a last purchase, the date', () => {
    const base = {
      supplierCode: 'S7',
      supplierName: 'S7 公司',
      price: 1.7,
      taxRate: 13,
      currency: 'RMB',
      validFrom: null,
      validTo: null,
      poNo: null,
    }
    const last = offerLabel({
      ...base,
      key: 'LAST_PURCHASE',
      source: 'LAST_PURCHASE',
      purchaseDate: '2026-10-23',
    })
    expect(last).toContain(sourceLabel('LAST_PURCHASE'))
    expect(last).toContain('(2026-10-23)')
    const strategy = offerLabel({ ...base, key: 'S7', source: 'STRATEGY', purchaseDate: null })
    expect(strategy).toContain(sourceLabel('STRATEGY'))
    expect(strategy).not.toContain('(')
    expect(sourceLabel(null)).toBe('')
  })
})

describe('parseManualPrice', () => {
  it('reads a price, treats blank and 0 as none and refuses bad input', () => {
    expect(parseManualPrice('0.85')).toBe(0.85)
    expect(parseManualPrice(12)).toBe(12)
    expect(parseManualPrice('')).toBeNull()
    expect(parseManualPrice('0')).toBeNull()
    expect(parseManualPrice(undefined)).toBeNull()
    expect(parseManualPrice('-1')).toBeUndefined()
    expect(parseManualPrice('1.1234567')).toBeUndefined()
    expect(parseManualPrice('abc')).toBeUndefined()
  })
})
