import axios from 'axios'
import { validateDraft, type Draft, type Rule, type Task } from './model'
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 409)
      return '记录已更新或申请已处理。输入已保留，请刷新后核对再提交。'
    return e.response?.data?.message || '请求失败，请重试。'
  }
  return e instanceof Error ? e.message : '操作失败，请重试。'
}
export function localTime(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19)
}
export function toInstant(v: string): string {
  const d = new Date(v)
  if (!v || !Number.isFinite(d.getTime())) throw new Error('请填写有效时间。')
  return d.toISOString()
}
export function editableDraft(t: Task): Draft {
  return {
    orderNumber: t.orderNumber,
    round: t.round,
    title: t.title,
    ownerUserId: t.ownerUserId,
    receivedAt: localTime(t.receivedAt),
    checklistConfirmed: t.checklistConfirmed,
    materials: t.materials.map((m) => ({
      ...clone(m),
      actualAt: localTime(m.actualAt),
      expectedAt: localTime(m.expectedAt),
    })),
  }
}
export function correctionPayload(d: Draft, original: Task): Draft {
  const error = validateDraft(d)
  if (error) throw new Error(error)
  return {
    orderNumber: original.orderNumber,
    round: original.round,
    title: d.title,
    ownerUserId: d.ownerUserId,
    receivedAt: original.receivedAt,
    checklistConfirmed: d.checklistConfirmed,
    materials: d.materials.map((m) => ({
      ...m,
      actualAt: m.actualAt ? toInstant(m.actualAt) : null,
      expectedAt: m.expectedAt ? toInstant(m.expectedAt) : null,
    })),
  }
}
export function validateRule(rule: Rule): string | null {
  if (
    !rule.timezone.trim() ||
    !rule.acceptanceRule.trim() ||
    !rule.reason.trim() ||
    !rule.evidenceRef.trim()
  )
    return '请填写业务时区、受理条件、依据说明及凭证。'
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: rule.timezone })
  } catch {
    return '业务时区无效。'
  }
  if (
    !rule.requiredMaterials.length ||
    rule.requiredMaterials.some((v) => !v.trim()) ||
    new Set(rule.requiredMaterials.map((v) => v.trim())).size !== rule.requiredMaterials.length
  )
    return '必备资料清单不能为空或重名。'
  return null
}
