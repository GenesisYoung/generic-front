/**
 * Purchase quotation (报价方案) shapes and pure helpers. All rates are
 * percentages (2.5 = 2.5%), as the backend sends them.
 */
import { lan } from '@/lang'

export type BomStatus = 'BOTH' | 'PRODUCT_ONLY' | 'PACKAGING_ONLY' | 'NONE'
export type BomFilter = 'ALL' | 'WITH' | 'WITHOUT'
export type FeeBase = 'MATERIAL' | 'COST' | 'PRICE'
export type PriceCheck = 'OK' | 'HIGH' | 'LOW' | 'NO_BASE' | 'NO_PRICE'
export type ItemKind = 'PRODUCT' | 'PACKAGING'

export interface Fee {
  code: string
  base: FeeBase
  ratePercent: number
  enabled: boolean
}

export interface MarginTier {
  minAmount: number
  ratePercent: number
}

export interface QuotationSettings {
  fees: Fee[]
  marginTiers: MarginTier[]
  priceCheckLow: number
  priceCheckHigh: number
}

export interface OrderSummary {
  orderNo: string
  customerCode: string | null
  customerName: string | null
  orderDate: string | null
  deliveryDate: string | null
  planNo: string | null
  planDate: string | null
  lineCount: number
  totalQty: number
  hasProductBom: boolean
  hasPackagingBom: boolean
  bomStatus: BomStatus
}

export interface OrderLine {
  lineId: string | null
  productCode: string | null
  productName: string | null
  spec: string | null
  qty: number | null
  unit: string | null
  productBomCode: string | null
  packagingBomCode: string | null
}

export interface SupplierPrice {
  supplierCode: string
  supplierName: string | null
  price: number
  taxRate: number | null
  currency: string | null
  validFrom: string | null
  validTo: string | null
}

export interface QuotationItem {
  kind: ItemKind
  bomCode: string | null
  productCode: string | null
  lineNo: number | null
  level: number | null
  materialCode: string
  materialName: string | null
  spec: string | null
  unit: string | null
  materialClass: string | null
  qtyPerUnit: number
  orderQty: number | null
  totalQty: number
  suppliers: SupplierPrice[]
  selectedSupplierCode: string | null
  selectedSupplierName: string | null
  unitPrice: number | null
  amount: number
  cheapestPrice: number | null
  basePrice: number | null
  priceCheck: PriceCheck
}

export interface FeeAmount {
  code: string
  base: FeeBase
  ratePercent: number
  baseAmount: number
  amount: number
}

export interface QuotationPlan {
  order: OrderSummary
  lines: OrderLine[]
  productItems: QuotationItem[]
  packagingItems: QuotationItem[]
  productMaterialCost: number
  packagingMaterialCost: number
  materialCost: number
  fees: FeeAmount[]
  costBeforeProfit: number
  marginRate: number
  marginTierMin: number | null
  marginOverridden: boolean
  profit: number
  totalPrice: number
  unitPrice: number | null
  currency: string | null
  missingPriceCount: number
  priceWarningCount: number
  warnings: string[]
  generatedAt: string | null
}

/** What the purchaser changed on the plan page; sent with every recalculation and export. */
export interface CalculateRequest {
  selections: Record<string, string>
  fees: Fee[] | null
  marginRate: number | null
}

export const FEE_CODES = [
  'SHIPPING',
  'LOADING',
  'MANAGEMENT',
  'MATERIAL_LOSS',
  'DEVELOPMENT',
  'TAX',
] as const
export const FEE_BASES: readonly FeeBase[] = ['MATERIAL', 'COST', 'PRICE']

export function bomStatusLabel(s: BomStatus): string {
  return lan[`quotationBom_${s}`] ?? s
}

export function bomStatusColor(s: BomStatus): string | undefined {
  if (s === 'BOTH') return 'success'
  if (s === 'NONE') return 'error'
  return 'warning'
}

export function feeLabel(code: string): string {
  return lan[`quotationFee_${code}`] ?? code
}

export function baseLabel(base: string): string {
  return lan[`quotationBase_${base}`] ?? base
}

export function checkLabel(c: PriceCheck): string {
  return lan[`quotationCheck_${c}`] ?? c
}

export function checkColor(c: PriceCheck): string | undefined {
  if (c === 'OK') return 'success'
  if (c === 'HIGH' || c === 'LOW' || c === 'NO_PRICE') return 'error'
  return undefined
}

const moneyFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const priceFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})
const qtyFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })

export function money(v: number | null | undefined): string {
  return v == null ? '—' : moneyFmt.format(v)
}

export function price(v: number | null | undefined): string {
  return v == null ? '—' : priceFmt.format(v)
}

export function qty(v: number | null | undefined): string {
  return v == null ? '—' : qtyFmt.format(v)
}

export function percent(v: number | null | undefined): string {
  return v == null ? '—' : `${qtyFmt.format(v)}%`
}

/** A blank request: cheapest suppliers, saved rates, margin by tier. */
export function emptyRequest(): CalculateRequest {
  return { selections: {}, fees: null, marginRate: null }
}

/** Valid rate: a number from 0 to 100. */
export function validRate(v: unknown): boolean {
  const n = typeof v === 'string' ? Number(v) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100
}

/** Checks the settings form; returns a localized message or ''. */
export function validateSettings(s: QuotationSettings): string {
  for (const f of s.fees) {
    if (!validRate(f.ratePercent)) return lan.quotationRateRange ?? ''
  }
  if (s.marginTiers.length === 0) return lan.quotationTierRequired ?? ''
  const mins = new Set<number>()
  for (const t of s.marginTiers) {
    const min = Number(t.minAmount)
    if (!Number.isFinite(min) || min < 0) return lan.quotationTierMin ?? ''
    if (mins.has(min)) return lan.quotationTierDuplicate ?? ''
    mins.add(min)
    if (!validRate(t.ratePercent)) return lan.quotationRateRange ?? ''
  }
  return ''
}

/** Numbers typed in text fields arrive as strings; the backend wants numbers. */
export function normalizeSettings(s: QuotationSettings): QuotationSettings {
  return {
    ...s,
    fees: s.fees.map((f) => ({ ...f, ratePercent: Number(f.ratePercent) })),
    marginTiers: s.marginTiers
      .map((t) => ({ minAmount: Number(t.minAmount), ratePercent: Number(t.ratePercent) }))
      .sort((a, b) => a.minAmount - b.minAmount),
  }
}

/** File name from a Content-Disposition header (RFC 5987 filename* first). */
export function fileNameFrom(header: string | undefined, fallback: string): string {
  if (!header) return fallback
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1])
    } catch {
      // fall through to the plain name
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? fallback
}
