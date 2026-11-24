import { lan } from '@/lang'

/**
 * Types and pure helpers for purchasing exceptions (采购异常). Mirrors the
 * backend's PurchaseExceptionView.
 */
export const CATEGORIES = ['DELAY', 'SHORTAGE', 'QUALITY', 'PRICE', 'CAPACITY', 'OTHER'] as const
export const SEVERITIES = ['NORMAL', 'HIGH', 'URGENT'] as const
export type Category = (typeof CATEGORIES)[number]
export type Severity = (typeof SEVERITIES)[number]
/**
 * RESOLVE only proposes a resolution: the exception waits in PENDING_APPROVAL
 * until the PMC department approves (RESOLVED) or rejects it (IN_PROGRESS).
 */
export type ExceptionStatus =
  | 'REPORTED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'RESOLVED'
  | 'CLOSED'
export type ExceptionAction =
  | 'REPORT'
  | 'ACKNOWLEDGE'
  | 'START'
  | 'COMMENT'
  | 'RESOLVE'
  | 'APPROVE'
  | 'REJECT'
  | 'CLOSE'
  | 'REOPEN'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
/** Which exceptions the list shows: not yet resolved, all, or waiting for PMC approval. */
export type ListView = 'open' | 'all' | 'approval'

/** One PMC approval task: created each time a resolution is proposed. */
export interface ExceptionApproval {
  id: number
  status: ApprovalStatus
  proposedResolution: string
  requestedBy: number
  requestedByName: string | null
  requestedAt: string
  decidedBy: number | null
  decidedByName: string | null
  decidedAt: string | null
  decisionComment: string | null
}

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
  /** PMC approval tasks, oldest first; only filled in the detail answer. */
  approvals?: ExceptionApproval[]
}

export interface ExceptionPage {
  content: PurchaseException[]
  totalElements: number
  totalPages: number
  page: number
  openCount: number
  /** Exceptions waiting for PMC approval; 0 outside the PMC department. */
  approvalCount?: number
  /** The user is in the PMC department and approves resolutions. */
  canApprove?: boolean
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

/** Actions that need text: the comment, the resolution, the reason to reopen or to reject. */
export function actionNeedsText(a: ExceptionAction): boolean {
  return a === 'COMMENT' || a === 'RESOLVE' || a === 'REOPEN' || a === 'REJECT'
}

/** Actions whose text is optional but sent when given (a note when approving). */
export function actionTakesText(a: ExceptionAction): boolean {
  return actionNeedsText(a) || a === 'APPROVE'
}

/** The approval task still waiting for PMC, if any. */
export function pendingApproval(x: PurchaseException): ExceptionApproval | null {
  return (x.approvals ?? []).find((a) => a.status === 'PENDING') ?? null
}

export function actionColor(a: ExceptionAction): string {
  if (a === 'RESOLVE' || a === 'CLOSE' || a === 'APPROVE') return 'success'
  if (a === 'REJECT') return 'error'
  return 'primary'
}

export function approvalColor(s: ApprovalStatus): string {
  return s === 'APPROVED' ? 'success' : s === 'REJECTED' ? 'error' : 'info'
}

export function label(
  group: 'Category' | 'Severity' | 'Status' | 'Action' | 'Approval',
  value: string,
): string {
  return lan[`exception${group}_${value}`] ?? value
}

export function statusColor(s: ExceptionStatus): string {
  switch (s) {
    case 'REPORTED':
      return 'error'
    case 'ACKNOWLEDGED':
    case 'IN_PROGRESS':
      return 'warning'
    case 'PENDING_APPROVAL':
      return 'info'
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
