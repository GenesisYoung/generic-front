/**
 * Types and pure helpers for purchase order follow-up (mirrors the backend's
 * FollowUpTodoItem, FollowUpRecordRequest and FollowUpRecordView).
 */
export type FollowUpStage = 'INITIAL' | 'INTENSIFIED' | 'DAILY' | 'OVERDUE'
export type MaterialStatus = 'ON_TRACK' | 'AT_RISK' | 'DELAYED'
export type CheckpointStatus = 'OPEN' | 'DONE' | 'MISSED' | 'CANCELLED'

/** One open checkpoint on the purchaser's to-do list. */
export interface TodoItem {
  checkpointId: number
  stage: FollowUpStage
  seq: number
  windowStart: string
  windowEnd: string
  /** Days from today to the window's last day; 0 = due today. */
  daysLeft: number
  purchaseOrderId: number
  poNo: string
  supplierCode: string | null
  supplierName: string | null
  orderDate: string
  expectedDeliveryDate: string | null
}

export interface FollowUpForm {
  materialStatus: MaterialStatus | null
  supplierPromisedDate: string
  missingOrderFound: boolean
  note: string
}

export interface FollowUpRecord {
  id: number
  purchaseOrderId: number
  checkpointId: number | null
  recordedBy: number
  recordedByName: string | null
  materialStatus: MaterialStatus
  supplierPromisedDate: string | null
  missingOrderFound: boolean
  note: string | null
  followedUpAt: string
}

export interface Checkpoint {
  id: number
  stage: FollowUpStage
  seq: number
  windowStart: string
  windowEnd: string
  status: CheckpointStatus
}

/** Result of saving a follow-up: the record and the checkpoint it completed (null for an extra one). */
export interface SavedFollowUp {
  record: FollowUpRecord
  completedCheckpoint: Checkpoint | null
}

export const NOTE_MAX = 500

export const stageLabels: Record<FollowUpStage, string> = {
  INITIAL: '第1-2周（每周2次）',
  INTENSIFIED: '第3周（每2天）',
  DAILY: '第4周（每天）',
  OVERDUE: '超期（每天）',
}

export const materialStatusLabels: Record<MaterialStatus, string> = {
  ON_TRACK: '正常',
  AT_RISK: '有风险',
  DELAYED: '已延误',
}

export const emptyForm = (): FollowUpForm => ({
  materialStatus: null,
  supplierPromisedDate: '',
  missingOrderFound: false,
  note: '',
})

/** "今天截止" for 0, otherwise "剩 N 天". */
export function daysLeftLabel(daysLeft: number): string {
  return daysLeft <= 0 ? '今天截止' : `剩 ${daysLeft} 天`
}

/** Chip colour: red when due today or in the overdue stage, orange for tomorrow, grey otherwise. */
export function urgencyColor(item: Pick<TodoItem, 'daysLeft' | 'stage'>): string {
  if (item.daysLeft <= 0 || item.stage === 'OVERDUE') return 'error'
  if (item.daysLeft === 1) return 'warning'
  return 'default'
}

/** The first problem with the form, or '' when it can be saved. */
export function validateForm(form: FollowUpForm): string {
  if (!form.materialStatus) return '请选择物料状态'
  if (form.note.length > NOTE_MAX) return `备注最多 ${NOTE_MAX} 个字符`
  if (form.supplierPromisedDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.supplierPromisedDate))
    return '供应商承诺交期格式应为 YYYY-MM-DD'
  return ''
}

/** The request body for POST /purchase-orders/{id}/followups. */
export function toRequest(form: FollowUpForm) {
  return {
    materialStatus: form.materialStatus,
    supplierPromisedDate: form.supplierPromisedDate || null,
    missingOrderFound: form.missingOrderFound,
    note: form.note.trim() || null,
  }
}
