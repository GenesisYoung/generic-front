import { resultLabels, statusLabels, type History } from './model'

const labels: Record<string, string> = {
  create: '建立评审草稿',
  edit: '修改评审资料',
  'check-data': '提交资料检查',
  accept: '正式受理',
  start: '开始处理',
  block: '登记阻塞',
  resume: '解除阻塞',
  submit: '提交评审成果',
  verify: '独立核验',
  'business-APPROVED': '主管业务确认通过',
  'business-RETURNED': '主管退回成果',
  'change-request': '提出变更申请',
  'change-APPROVED': '批准变更',
  'change-REJECTED': '驳回变更',
  'approved-review-again': '建立获批重评任务',
}
const defaults: Record<string, string> = {
  'check-data': '已提交资料检查，等待资料补齐或主管正式受理。',
  start: '已开始处理本轮订单评审。',
  accept: '已正式受理，并固定本轮批准期限。',
  resume: '前置事项已解决，恢复评审处理。',
  submit: '已提交新的评审成果，等待核验。',
  verify: '已记录本版成果的独立核验结果。',
}
const changes: Record<string, string> = {
  DEADLINE: '改期',
  REOPEN: '重开',
  CANCEL: '撤销',
  MATERIAL_CORRECTION: '受理后资料修正',
  DECLINE: '不予承接',
  REVIEW_AGAIN: '新轮次重评',
}
const decisions: Record<string, string> = {
  APPROVED: '通过',
  REJECTED: '驳回',
  RETURNED: '退回',
  PENDING: '待审批',
}
export const historyActionLabel = (action: string): string => labels[action] || '业务操作'

/** Format historical request snapshots for readers without rewriting stored audit facts. */
export function historyNote(
  h: History,
  format: { date: (value: string) => string; person: (id: string) => string },
): string {
  const fallback = defaults[h.action] || '已记录本次操作。'
  const note = h.note?.trim() || ''
  if (!note) return fallback
  if (!note.startsWith('{') && !note.startsWith('[')) return note
  let value: unknown,
    suffix = ''
  try {
    // Approved re-review records may append a human-readable new-task reference.
    const end = note.lastIndexOf(note.startsWith('{') ? '}' : ']')
    if (end < 0) return '已记录本次操作，详细信息暂无法显示。'
    value = JSON.parse(note.slice(0, end + 1))
    suffix = note
      .slice(end + 1)
      .replace(/^[；;\s]+/, '')
      .trim()
  } catch {
    return '已记录本次操作，详细信息暂无法显示。'
  }
  if (Array.isArray(value)) {
    // Legacy business-confirmation snapshot: version, decision, reason, proof, lock.
    if (!h.action.startsWith('business-')) return fallback
    value = {
      submissionVersion: value[0],
      decision: value[1],
      reason: value[2],
      evidenceRef: value[3],
    }
  }
  if (!value || typeof value !== 'object') return fallback
  const data = value as Record<string, unknown>
  const lines: string[] = []
  function field(key: string, label: string, render: (text: string) => string = (s) => s) {
    const v = data[key]
    if ((typeof v === 'string' && v.trim()) || (typeof v === 'number' && Number.isFinite(v)))
      lines.push(`${label}：${render(String(v))}`)
  }
  field('type', '变更事项', (v) => changes[v] || '其他变更')
  field('submissionVersion', '成果版本', (v) => `第${v}版`)
  field('result', '核验结果', (v) => resultLabels[v as keyof typeof resultLabels] || '待确认')
  field('decision', '处理结论', (v) => decisions[v] || '待确认')
  field(
    'status',
    '申请状态',
    (v) => decisions[v] || statusLabels[v as keyof typeof statusLabels] || '待确认',
  )
  field('basis', '批准依据')
  field('reason', '说明')
  field('conclusion', '评审结论')
  field('dueAt', '批准截止时间', format.date)
  field('proposedDueAt', '申请截止时间', format.date)
  field('completedAt', '员工填报完成时间', format.date)
  field('nextAction', '下一动作')
  field('nextOwnerUserId', '协作人', format.person)
  field('nextFeedbackAt', '下一反馈时间', format.date)
  field('evidenceRef', '凭证编号')
  field('decisionReason', '审批说明')
  field('decisionEvidence', '审批凭证')
  if (suffix) lines.push(suffix)
  return lines.length ? lines.join('\n') : fallback
}
