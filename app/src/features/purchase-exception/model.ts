import { lan } from '@/lang'

/**
 * Types and pure helpers for purchasing exceptions (采购异常). Mirrors the
 * backend's PurchaseExceptionView.
 */
export const CATEGORIES = ['DELAY', 'SHORTAGE', 'QUALITY', 'PRICE', 'CAPACITY', 'OTHER'] as const
export const SEVERITIES = ['NORMAL', 'HIGH', 'URGENT'] as const
export type Category = (typeof CATEGORIES)[number]
export type Severity = (typeof SEVERITIES)[number]
export type ExceptionStatus = 'REPORTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type ExceptionAction =
  | 'REPORT'
  | 'ACKNOWLEDGE'
  | 'START'
  | 'COMMENT'
  | 'RESOLVE'
  | 'CLOSE'
  | 'REOPEN'

export interface ExceptionLog {
  action: ExceptionAction
  fromStatus: ExceptionStatus | null
  toStatus: ExceptionStatus
  operatorId: number
  operatorName: string | null
  comment: string | null
  createdAt: string
}

export interface PurchaseException {
  id: number
  exceptionNo: string
  purchaseOrderId: number
  poNo: string
  supplierName: string | null
  category: Category
  severity: Severity
  description: string
  impactDate: string | null
  status: ExceptionStatus
  reporterId: number
  reporterName: string | null
  handlerId: number | null
  handlerName: string | null
  resolution: string | null
  reportedAt: string
  resolvedAt: string | null
  closedAt: string | null
  updatedAt: string
  lockVersion: number
  /** What the current user may do now. */
  allowedActions: ExceptionAction[]
  /** Only filled in the detail answer. */
  history: ExceptionLog[]
}

export interface ExceptionPage {
  content: PurchaseException[]
  totalElements: number
  totalPages: number
  page: number
  openCount: number
  canReport: boolean
}

export interface ReportForm {
  purchaseOrderId: number | null
  poNo: string
  category: Category | null
  severity: Severity
  description: string
  impactDate: string
}

export const TEXT_MAX = 2000

export function emptyReportForm(purchaseOrderId: number | null = null, poNo = ''): ReportForm {
  return {
    purchaseOrderId,
    poNo,
    category: null,
    severity: 'NORMAL',
    description: '',
    impactDate: '',
  }
}

/** The lang key of a problem with the form, or null when it can be sent. */
export function reportFormError(f: ReportForm): string | null {
  if (f.purchaseOrderId == null && !f.poNo.trim()) return 'exceptionPoRequired'
  if (!f.category) return 'exceptionCategoryRequired'
  const d = f.description.trim()
  if (!d) return 'exceptionDescriptionRequired'
  if (d.length > TEXT_MAX) return 'exceptionTextTooLong'
  if (f.impactDate && !/^\d{4}-\d{2}-\d{2}$/.test(f.impactDate)) return 'exceptionDateFormat'
  return null
}

/** Actions that need text: the comment, the resolution, or the reason to reopen. */
export function actionNeedsText(a: ExceptionAction): boolean {
  return a === 'COMMENT' || a === 'RESOLVE' || a === 'REOPEN'
}

export function label(group: 'Category' | 'Severity' | 'Status' | 'Action', value: string): string {
  return lan[`exception${group}_${value}`] ?? value
}

export function statusColor(s: ExceptionStatus): string {
  switch (s) {
    case 'REPORTED':
      return 'error'
    case 'ACKNOWLEDGED':
    case 'IN_PROGRESS':
      return 'warning'
    case 'RESOLVED':
      return 'success'
    default:
      return 'default'
  }
}

export function severityColor(s: Severity): string {
  return s === 'URGENT' ? 'error' : s === 'HIGH' ? 'warning' : 'default'
}

/** "2026-11-20 09:15" from an ISO local date-time; '' for null. */
export function shortDateTime(value: string | null): string {
  return value ? value.replace('T', ' ').slice(0, 16) : ''
}
