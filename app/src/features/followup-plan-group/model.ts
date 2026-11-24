import { fmt, lan } from '@/lang'

/**
 * Types and pure helpers for follow-up plan groups (mirrors the backend's
 * PlanGroupOverview, PlanGroupRequest and PlanTypeRequest).
 *
 * Every purchase order line has a plan type. Plan types in the same group
 * count as the same plan. A group marked "own task" is followed up as its own
 * task series in every order that has open lines of it; all other lines stay
 * in the order's main follow-up task.
 */
export interface PlanGroup {
  id: number
  name: string
  /** True: its lines get their own follow-up task. False: they stay in the main task. */
  separate: boolean
  /** Template for its own task; null = the default template. */
  templateId: number | null
  templateName: string | null
  note: string | null
  typeCodes: string[]
  /** Open orders that have this group's own task now. */
  openOrders: number
}

export interface PlanType {
  id: number
  code: string
  name: string | null
  /** null = not in a group (main task). */
  groupId: number | null
  lineCount: number
  /** null for a type added by hand that the sync has not seen yet. */
  lastSeenAt: string | null
}

export interface PlanGroupOverview {
  groups: PlanGroup[]
  types: PlanType[]
  /** False when the server does not sync order lines, so groups have no effect yet. */
  linesSynced: boolean
}

export interface GroupForm {
  name: string
  separate: boolean
  templateId: number | null
  note: string
  typeCodes: string[]
}

/** What "apply to open orders" changed. */
export interface RefreshResult {
  orders: number
  seriesStarted: number
  seriesEnded: number
}

// The same limits as the backend (FollowUpPlanGroupService).
export const NAME_MAX = 100
export const NOTE_MAX = 200
export const CODE_MAX = 50

export const emptyGroupForm = (): GroupForm => ({
  name: '',
  separate: true,
  templateId: null,
  note: '',
  typeCodes: [],
})

export function groupFormFrom(g: PlanGroup): GroupForm {
  return {
    name: g.name,
    separate: g.separate,
    templateId: g.templateId,
    note: g.note ?? '',
    typeCodes: [...g.typeCodes],
  }
}

/** The first problem with the form, or '' when it can be saved. */
export function validateGroup(form: GroupForm, groups: PlanGroup[], selfId: number | null): string {
  const name = form.name.trim()
  if (!name || name.length > NAME_MAX) return fmt(lan.planGroupNameRequired, NAME_MAX)
  if (groups.some((g) => g.id !== selfId && g.name.toLowerCase() === name.toLowerCase()))
    return fmt(lan.planGroupNameExists, name)
  if (form.note.trim().length > NOTE_MAX) return fmt(lan.planGroupNoteTooLong, NOTE_MAX)
  return ''
}

export function toGroupRequest(form: GroupForm) {
  return {
    name: form.name.trim(),
    separate: form.separate,
    templateId: form.templateId,
    note: form.note.trim() || null,
    typeCodes: form.typeCodes,
  }
}

/** "HW 五金" or just "HW". */
export function typeLabel(t: Pick<PlanType, 'code' | 'name'>): string {
  return t.name ? `${t.code} ${t.name}` : t.code
}

/** The group a type is in, or the "main task" label. */
export function groupNameOf(groupId: number | null, groups: PlanGroup[]): string {
  if (groupId == null) return lan.planGroupNone ?? ''
  return groups.find((g) => g.id === groupId)?.name ?? fmt(lan.followUpGroupFallback, groupId)
}

/** How the group is followed up, in the UI language. */
export function modeLabel(g: Pick<PlanGroup, 'separate'>): string {
  return (g.separate ? lan.planGroupOwnTask : lan.planGroupMerged) ?? ''
}

/** Result message of "apply to open orders". */
export function refreshMessage(r: RefreshResult): string {
  return fmt(lan.planGroupApplied, r.orders, r.seriesStarted, r.seriesEnded)
}
