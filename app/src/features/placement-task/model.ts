import { fmt, lan } from '@/lang'

/**
 * Types and pure helpers for purchase placement tasks (采购下单任务): place the
 * purchase orders of a customer order within 2 days of its audit passing.
 * Mirrors the backend's PlacementTaskView.
 */
export type PlacementStatus = 'OPEN' | 'DONE' | 'SKIPPED'

export interface PlacementTask {
  id: number
  orderNo: string
  customerName: string | null
  auditRound: number
  auditVerifiedAt: string
  deadlineAt: string
  /** Whole hours until the deadline; negative when overdue. */
  hoursLeft: number
  status: PlacementStatus
  assigneeId: number | null
  assigneeName: string | null
  assignedAt: string | null
  doneAt: string | null
  /** LINKED_PO: closed by a PO the old ERP links to the order; MANUAL: PO number typed in. */
  doneSource: 'LINKED_PO' | 'MANUAL' | null
  donePoNo: string | null
  linkedPoNos: string[]
  /** Order lines with at least one linked PO. */
  linesWithPo: number
  /** Lines of the customer order; null when the order is not synced. */
  lineCount: number | null
}

export interface PlacementPage {
  content: PlacementTask[]
  totalElements: number
  totalPages: number
  page: number
  /** True for purchasing managers (data.purchaseOrder.all): they see and assign every task. */
  canAssign: boolean
}

export interface Purchaser {
  id: number
  name: string
}

/** Tasks due within this many hours are shown as "due soon" (the backend reminds 12 h before). */
export const DUE_SOON_HOURS = 12

/** "剩余 1 天 5 小时", "已超期 3 小时", "已完成" … */
export function deadlineLabel(t: PlacementTask): string {
  if (t.status === 'DONE') return lan.placementDone ?? ''
  if (t.status === 'SKIPPED') return lan.placementSkipped ?? ''
  const h = Math.abs(t.hoursLeft)
  const days = Math.floor(h / 24)
  const hours = h % 24
  const span = days > 0 ? fmt(lan.placementDaysHours, days, hours) : fmt(lan.placementHours, hours)
  return fmt(t.hoursLeft < 0 ? lan.placementOverdueBy : lan.placementTimeLeft, span)
}

export function deadlineColor(t: PlacementTask): string {
  if (t.status === 'DONE') return 'success'
  if (t.status === 'SKIPPED') return 'default'
  if (t.hoursLeft < 0) return 'error'
  if (t.hoursLeft <= DUE_SOON_HOURS) return 'warning'
  return 'info'
}

/** "2/3" lines with a PO, or "2" when the order's line count is unknown. */
export function lineCoverage(t: PlacementTask): string {
  return t.lineCount == null ? String(t.linesWithPo) : `${t.linesWithPo}/${t.lineCount}`
}

/** How the task was closed: "关联采购单 PO-1" or "手工填写 PO-1". */
export function doneLabel(t: PlacementTask): string {
  if (t.status !== 'DONE' || !t.donePoNo) return ''
  const key = t.doneSource === 'MANUAL' ? lan.placementDoneManual : lan.placementDoneLinked
  return fmt(key, t.donePoNo)
}

/** Client-side check before sending a hand-typed PO number (the backend checks again). */
export function validPoNo(value: string): boolean {
  const v = value.trim()
  return v.length > 0 && v.length <= 50
}

/** "2026-11-20 09:15" from an ISO local date-time; '' for null. */
export function shortDateTime(value: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 16) : ''
}
