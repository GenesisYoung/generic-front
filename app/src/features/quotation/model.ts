/**
 * Purchase quotation (报价方案) shapes and pure helpers. All rates are
 * percentages (2.5 = 2.5%), as the backend sends them.
 */
import { fmt, lan } from '@/lang'

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
  /** Lines of the purchase plan, and how many of them already have a purchase order. */
  planLines: number
  planLinesBought: number
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
  /** Priced BOM lines of this order line; null without any. */
  materialCost: number | null
  /** This line's share of the quotation total, and per unit; null without priced material. */
  totalPrice: number | null
  unitPrice: number | null
}

/** Where a price comes from: the material's most recent purchase order line, or the purchase strategy (采购策略). */
export type PriceSource = 'LAST_PURCHASE' | 'STRATEGY' | 'MANUAL'

/** The selection key of the last purchase price (a strategy price is chosen by its supplier code). */
export const LAST_PURCHASE_KEY = 'LAST_PURCHASE'

export interface SupplierPrice {
  /** What CalculateRequest.selections names to choose this price. */
  key: string
  source: PriceSource
  supplierCode: string
  supplierName: string | null
  price: number
  taxRate: number | null
  currency: string | null
  validFrom: string | null
  validTo: string | null
  /** Set for LAST_PURCHASE. */
  purchaseDate: string | null
  poNo: string | null
}

export interface QuotationItem {
  kind: ItemKind
  bomCode: string | null
  /** Order line (ORDCORD2.ERI) the BOM line belongs to. */
  lineId: string | null
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
  /** Last purchase price first (when bought before), then strategy prices, cheapest first. */
  suppliers: SupplierPrice[]
  selectedKey: string | null
  selectedSupplierCode: string | null
  selectedSupplierName: string | null
  unitPrice: number | null
  amount: number
  cheapestPrice: number | null
  basePrice: number | null
  priceCheck: PriceCheck
  /** Source of the price used; null without any price. */
  priceSource: PriceSource | null
  /** Set when priceSource is LAST_PURCHASE. */
  lastPurchaseDate: string | null
  lastPurchaseNo: string | null
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
  /** Material code -> SupplierPrice.key (LAST_PURCHASE or a strategy supplier code). */
  selections: Record<string, string>
  fees: Fee[] | null
  marginRate: number | null
  /** Material code -> unit price INCLUDING tax typed in for a material without any price. */
  manualPrices: Record<string, number>
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

/** "Nothing bought" or "1 of 4 plan lines bought". */
export function boughtLabel(o: Pick<OrderSummary, 'planLines' | 'planLinesBought'>): string {
  if (!o.planLines) return lan.quotationBoughtNoPlan ?? '—'
  if (!o.planLinesBought) return lan.quotationBoughtNone ?? ''
  if (o.planLinesBought >= o.planLines) return lan.quotationBoughtAll ?? ''
  return fmt(lan.quotationBoughtPart, o.planLinesBought, o.planLines)
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

export function sourceLabel(s: PriceSource | null): string {
  return s ? (lan[`quotationSource_${s}`] ?? s) : ''
}

/** One choice of the supplier list: source, supplier, price, and the purchase date of a last purchase. */
export function offerLabel(s: SupplierPrice): string {
  const when =
    s.source === 'LAST_PURCHASE' && s.purchaseDate ? ` (${s.purchaseDate.slice(0, 10)})` : ''
  return `${sourceLabel(s.source)} · ${s.supplierName || s.supplierCode} · ${price(s.price)}${
    s.currency ? ' ' + s.currency : ''
  }${when}`
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

/** A blank request: last purchase / cheapest strategy prices, saved rates, margin by tier. */
export function emptyRequest(): CalculateRequest {
  return { selections: {}, fees: null, marginRate: null, manualPrices: {} }
}

/**
 * A typed-in unit price: null when the field is blank or 0 (no manual
 * price), undefined when it is not a valid price (negative, not a number or
 * more than 6 decimals).
 */
export function parseManualPrice(v: unknown): number | null | undefined {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const s = String(v).trim()
  if (!/^\d+(\.\d{1,6})?$/.test(s)) return undefined
  const n = Number(s)
  if (!Number.isFinite(n) || n >= 100000000) return undefined
  return n === 0 ? null : n
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
