import { fmt, lan } from '@/lang'

/**
 * Types and pure helpers for purchase order follow-up (mirrors the backend's
 * FollowUpTodoItem, FollowUpRecordRequest and FollowUpRecordView).
 */
export type FollowUpStage = 'INITIAL' | 'INTENSIFIED' | 'DAILY' | 'NOTIFY' | 'OVERDUE'
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
  /** The order's follow-up template; null when the order has none (the default applies). */
  templateId: number | null
  templateName: string | null
  /** The plan group whose own follow-up task this is; null = the order's main task. */
  planGroupId: number | null
  planGroupName: string | null
}

/** A to-do filter: every task, only main tasks, or one plan group's tasks. */
export type SeriesFilter = 'ALL' | 'MAIN' | number

/** The plan groups that appear in the list, by name, for the filter chips. */
export function groupsInList(items: TodoItem[]): { id: number; name: string; count: number }[] {
  const byId = new Map<number, { id: number; name: string; count: number }>()
  for (const i of items) {
    if (i.planGroupId == null) continue
    const g = byId.get(i.planGroupId) ?? {
      id: i.planGroupId,
      name: i.planGroupName ?? '',
      count: 0,
    }
    g.count++
    byId.set(i.planGroupId, g)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function filterBySeries(items: TodoItem[], filter: SeriesFilter): TodoItem[] {
  if (filter === 'ALL') return items
  if (filter === 'MAIN') return items.filter((i) => i.planGroupId == null)
  return items.filter((i) => i.planGroupId === filter)
}

/** "Main task" or the plan group's name, for a task's series. */
export function seriesLabel(item: Pick<TodoItem, 'planGroupId' | 'planGroupName'>): string {
  return item.planGroupId == null
    ? (lan.followUpMainTask ?? '')
    : item.planGroupName || fmt(lan.followUpGroupFallback, item.planGroupId)
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

/** Labels come from the lang files, so they follow the UI language. */
export const stageLabels: Record<FollowUpStage, string> = {
  INITIAL: lan.followUpStageInitial ?? 'INITIAL',
  INTENSIFIED: lan.followUpStageIntensified ?? 'INTENSIFIED',
  DAILY: lan.followUpStageDaily ?? 'DAILY',
  NOTIFY: lan.followUpStageNotify ?? 'NOTIFY',
  OVERDUE: lan.followUpStageOverdue ?? 'OVERDUE',
}

export const materialStatusLabels: Record<MaterialStatus, string> = {
  ON_TRACK: lan.materialOnTrack ?? 'ON_TRACK',
  AT_RISK: lan.materialAtRisk ?? 'AT_RISK',
  DELAYED: lan.materialDelayed ?? 'DELAYED',
}

export const emptyForm = (): FollowUpForm => ({
  materialStatus: null,
  supplierPromisedDate: '',
  missingOrderFound: false,
  note: '',
})

/** "Due today" for 0, otherwise "N days left" (in the UI language). */
export function daysLeftLabel(daysLeft: number): string {
  return daysLeft <= 0 ? (lan.followUpDueToday ?? '') : fmt(lan.followUpDaysLeft, daysLeft)
}

/** Chip colour: red when due today or in the overdue stage, orange for tomorrow, grey otherwise. */
export function urgencyColor(item: Pick<TodoItem, 'daysLeft' | 'stage'>): string {
  if (item.daysLeft <= 0 || item.stage === 'OVERDUE') return 'error'
  if (item.daysLeft === 1) return 'warning'
  return 'default'
}

/** The first problem with the form, or '' when it can be saved. */
export function validateForm(form: FollowUpForm): string {
  if (!form.materialStatus) return lan.followUpChooseStatus ?? ''
  if (form.note.length > NOTE_MAX) return fmt(lan.followUpNoteTooLong, NOTE_MAX)
  if (form.supplierPromisedDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.supplierPromisedDate))
    return lan.followUpDateFormat ?? ''
  return ''
}

/** The request body for POST /purchase-orders/{id}/followups and /followups/checkpoints/{id}/complete. */
export function toRequest(form: FollowUpForm) {
  return {
    materialStatus: form.materialStatus,
    supplierPromisedDate: form.supplierPromisedDate || null,
    missingOrderFound: form.missingOrderFound,
    note: form.note.trim() || null,
  }
}
