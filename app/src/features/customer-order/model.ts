import { fmt, lan } from '@/lang'

/**
 * Types and pure helpers for customer orders copied from the old ERP (mirrors
 * the backend's CustomerOrderView and sync state).
 */
export interface CustomerOrder {
  id: number
  orderNo: string
  customerCode: string | null
  customerName: string | null
  orderDate: string
  deliveryDate: string | null
  salesCode: string | null
  lineCount: number | null
  totalQty: number | null
  /** Audited in the old ERP (informational). */
  legacyAudited: boolean
  /** Closed in the old ERP: needs no audit. */
  legacyClosed: boolean
  firstSeenAt: string
  /** Open in the old ERP and no order audit created yet. */
  needsReview: boolean
  auditTaskId: string | null
  auditRound: number | null
  auditStatus: string | null
}

export interface CustomerOrderPage {
  content: CustomerOrder[]
  totalElements: number
  totalPages: number
  page: number
  pendingCount: number
}

export interface SyncState {
  syncKey: string
  lastRunAt: string | null
  lastStatus: 'OK' | 'FAILED' | null
  lastMessage: string | null
  lastRowCount: number | null
}

export type ListView = 'pending' | 'all'

/** Query for the order audit page that opens its create dialog with this order number. */
export function createAuditQuery(order: Pick<CustomerOrder, 'orderNo'>): { createFor: string } {
  return { createFor: order.orderNo }
}

/** The review column: "待创建评审", "已关闭", or "第2轮 · 已核验". */
export function reviewLabel(o: CustomerOrder): string {
  if (o.auditStatus) {
    const status = lan[`auditStatus_${o.auditStatus}`] ?? o.auditStatus
    return `${fmt(lan.customerOrderRound, o.auditRound ?? 1)} · ${status}`
  }
  if (o.legacyClosed) return lan.customerOrderClosed ?? ''
  return lan.customerOrderNeedsReview ?? ''
}

/** Chip colour for the review column. */
export function reviewColor(o: CustomerOrder): string {
  if (o.needsReview) return 'warning'
  if (o.auditStatus === 'VERIFIED') return 'success'
  if (o.auditStatus) return 'info'
  return 'default'
}

/** "2026-11-20 09:15" from an ISO local date-time; '' for null. */
export function shortDateTime(value: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 16) : ''
}
