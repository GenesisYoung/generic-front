import { fmt, lan } from '@/lang'

/**
 * Types and pure helpers for follow-up templates (mirrors the backend's
 * FollowUpTemplateView and FollowUpTemplateRequest). Day N means N calendar
 * days after the order date, so day 1 is the day after the order is placed.
 */
export interface TemplateStage {
  stage: string
  startDay: number
  endDay: number
  periodDays: number
  checksPerPeriod: number
}

export interface FollowUpTemplate {
  id: number
  name: string
  materialNote: string | null
  productionDays: number | null
  notifyDays: number[]
  /** Days per reminder after the production period; 0 = no reminders after it. */
  overduePeriodDays: number
  isDefault: boolean
  /** False for the built-in stage plan (twice a week, then every 2 days, then daily). */
  dayBased: boolean
  stages: TemplateStage[]
  /** Purchase orders still being followed up with this template. */
  activeOrders: number
}

export interface TemplateForm {
  name: string
  materialNote: string
  productionDays: number | null
  notifyDays: number[]
  overduePeriodDays: number | null
}

/** One planned task of a template, in day numbers. */
export interface PreviewTask {
  seq: number
  fromDay: number
  toDay: number
}

// The same limits as the backend (FollowUpRuleService).
export const NAME_MAX = 100
export const NOTE_MAX = 200
export const PRODUCTION_MAX = 365
export const DAYS_MAX = 60
export const OVERDUE_MAX = 30

export const emptyTemplateForm = (): TemplateForm => ({
  name: '',
  materialNote: '',
  productionDays: 30,
  notifyDays: [],
  overduePeriodDays: 1,
})

/**
 * The form for editing a template. A built-in stage plan has no notification
 * days, so its days are filled with the first day of each of its tasks; saving
 * turns it into a day-based template with the same tasks.
 */
export function formFrom(t: FollowUpTemplate): TemplateForm {
  return {
    name: t.name,
    materialNote: t.materialNote ?? '',
    productionDays: t.productionDays,
    notifyDays: t.dayBased ? [...t.notifyDays] : stageTaskStartDays(t.stages),
    overduePeriodDays: t.overduePeriodDays,
  }
}

/** Sorted, without duplicates. */
export function normalizeDays(days: number[]): number[] {
  return [...new Set(days)].sort((a, b) => a - b)
}

/** Adds the day when it is missing, removes it when present. */
export function toggleDay(days: number[], day: number): number[] {
  return days.includes(day) ? days.filter((d) => d !== day) : normalizeDays([...days, day])
}

/** Every `every` days inside the production period: every=7, production=30 gives 7, 14, 21, 28. */
export function everyNDays(production: number, every: number): number[] {
  if (!Number.isInteger(every) || every < 1 || !Number.isInteger(production) || production < 1)
    return []
  const days: number[] = []
  for (let d = every; d <= production && days.length < DAYS_MAX; d += every) days.push(d)
  return days
}

/**
 * The tasks a day-based template plans (same rule as the backend's
 * FollowUpPlanBuilder.buildFromDays): task i runs from its day until the day
 * before the next notification day; the last one runs to the end of the
 * production period.
 */
export function previewTasks(days: number[], production: number | null): PreviewTask[] {
  const sorted = normalizeDays(days).filter((d) => d >= 1)
  const last = sorted[sorted.length - 1]
  if (last === undefined) return []
  const end = Math.max(last, production ?? 0)
  return sorted.map((fromDay, i) => {
    const next = sorted[i + 1]
    return { seq: i + 1, fromDay, toDay: next === undefined ? end : next - 1 }
  })
}

/** First day of every task in a stage plan (same split as FollowUpPlanBuilder.build). */
export function stageTaskStartDays(stages: TemplateStage[]): number[] {
  const starts: number[] = []
  for (const s of [...stages].sort((a, b) => a.startDay - b.startDay)) {
    for (let p = s.startDay; p <= s.endDay; p += s.periodDays) {
      const length = Math.min(s.periodDays, s.endDay - p + 1)
      const windows = Math.min(s.checksPerPeriod, length)
      let from = p
      for (let i = 1; i <= windows; i++) {
        starts.push(from)
        from = p + Math.floor((length * i) / windows)
      }
    }
  }
  return starts
}

/** yyyy-MM-dd of `orderDate` plus `days` calendar days (local time). */
export function addDays(orderDate: Date, days: number): string {
  const d = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate() + days)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** The first problem with the form (in the UI language), or '' when it can be saved. */
export function validateTemplate(form: TemplateForm): string {
  const name = form.name.trim()
  if (!name || name.length > NAME_MAX) return fmt(lan.fuTplErrName, NAME_MAX)
  if (form.materialNote.trim().length > NOTE_MAX) return fmt(lan.fuTplErrNote, NOTE_MAX)
  const p = form.productionDays
  if (p == null || !Number.isInteger(p) || p < 1 || p > PRODUCTION_MAX)
    return fmt(lan.fuTplErrProduction, PRODUCTION_MAX)
  const days = normalizeDays(form.notifyDays)
  if (days.length === 0 || days.length > DAYS_MAX) return fmt(lan.fuTplErrDaysCount, DAYS_MAX)
  if ((days[0] ?? 0) < 1 || (days[days.length - 1] ?? 0) > p) return fmt(lan.fuTplErrDayRange, p)
  const o = form.overduePeriodDays ?? 1
  if (!Number.isInteger(o) || o < 0 || o > OVERDUE_MAX) return fmt(lan.fuTplErrOverdue, OVERDUE_MAX)
  return ''
}

/** The request body for POST /followup-templates and PUT /followup-templates/{id}. */
export function toTemplateRequest(form: TemplateForm) {
  return {
    name: form.name.trim(),
    materialNote: form.materialNote.trim() || null,
    productionDays: form.productionDays,
    notifyDays: normalizeDays(form.notifyDays),
    overduePeriodDays: form.overduePeriodDays ?? 1,
  }
}

/** "Every 2 days" or "No reminders" for the interval after the production period. */
export function overdueLabel(days: number): string {
  return days > 0 ? fmt(lan.fuTplOverdueEvery, days) : (lan.fuTplOverdueNone ?? '')
}

/** The notification days in words, e.g. "3 notifications: day 3, 10, 20". */
export function daysLabel(t: FollowUpTemplate): string {
  if (!t.dayBased) return lan.fuTplBuiltIn ?? ''
  return fmt(lan.fuTplDaysSummary, t.notifyDays.length, t.notifyDays.join(', '))
}
