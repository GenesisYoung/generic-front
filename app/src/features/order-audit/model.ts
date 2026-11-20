/** A1 API contract. Deployment and legacy-data migration remain separate steps. */
export const statusLabels = {
  DRAFT: '草稿',
  WAITING_DATA: '待补资料',
  TODO: '未开始',
  IN_PROGRESS: '进行中',
  BLOCKED: '外部阻塞',
  SUBMITTED: '待核验',
  RETURNED: '退回补证',
  VERIFIED: '已核验',
  CANCELLED: '已撤销',
} as const
export type Status = keyof typeof statusLabels
export type Result = 'PASS' | 'FAIL' | 'NEED_PROOF' | 'DISPUTED'
export const resultLabels: Record<Result, string> = {
  PASS: '符合',
  FAIL: '不符合',
  NEED_PROOF: '需补证',
  DISPUTED: '归责争议',
}
export interface Person {
  id: string
  name: string
}
export interface Material {
  id: string
  name: string
  required: boolean
  status: 1 | 2 | 3
  missingParts: string
  ownerUserId: string | null
  expectedAt: string | null
  actualAt: string | null
  evidenceRef: string
}
export interface Draft {
  orderNumber: string
  round: number
  title: string
  ownerUserId: string | null
  receivedAt: string | null
  checklistConfirmed: boolean
  materials: Material[]
}
export type Action = 'check-data' | 'accept' | 'start' | 'block' | 'resume' | 'submit' | 'verify'
export interface ActionInput {
  lockVersion: number
  dueAt?: string
  basis?: string
  reason?: string
  evidenceRef?: string
  nextAction?: string
  nextOwnerUserId?: string
  nextFeedbackAt?: string
  conclusion?: string
  completedAt?: string
  result?: Result
}
export interface Submission {
  version: number
  conclusion: string
  evidenceRef: string
  completedAt: string | null
  reportedCompletedAt?: string
  submittedAt: string
  submittedBy: string
  materialsSnapshot?: Material[]
  ruleSnapshot?: Rule
  verificationRecords?: {
    result: Result
    reason: string
    evidenceRef: string
    verifiedBy: string
    verifiedAt: string
  }[]
  businessConfirmations?: {
    decision: 'APPROVED' | 'RETURNED'
    reason: string
    evidenceRef: string
    confirmedBy: string
    confirmedAt: string
  }[]
}
export interface History {
  at: string
  actor: string
  action: string
  note: string
  actorId?: string
  before?: unknown
  after?: unknown
}
export interface Task extends Draft {
  id: string
  taskNumber: string
  status: Status
  lockVersion: number
  ownerName: string | null
  acceptedAt: string | null
  originalDueAt: string | null
  effectiveDueAt: string | null
  completedAt: string | null
  verificationResult: Result | null
  nextAction: string | null
  nextOwnerUserId: string | null
  nextFeedbackAt: string | null
  submissions: Submission[]
  history: History[]
  acceptanceRuleSnapshot?: Rule
  changeRequests?: Change[]
  reviewParentTaskId?: string | null
  reviewChildTaskId?: string | null
  /** Server authorizes each action; presence never substitutes server checks. */
  allowedActions: (Action | 'edit' | WorkflowCapability)[]
}
export interface Query {
  keyword: string
  ownerUserId: string | null
  status: Status | null
  dueFrom: string
  dueTo: string
  timing: string | null
  page: number
  size: number
}
export interface Page {
  items: Task[]
  total: number
  sourceChecked: boolean
  asOf: string
}
export interface Metadata {
  users: Person[]
  canCreate: boolean
  timezone: string | null
  acceptanceRule: string | null
  completionRule: string | null
  currentUserId?: string
  canConfigureRules?: boolean
  canApproveRules?: boolean
  canExport?: boolean
}
export function emptyDraft(): Draft {
  return {
    orderNumber: '',
    round: 1,
    title: '',
    ownerUserId: null,
    receivedAt: null,
    checklistConfirmed: false,
    materials: [],
  }
}
export function isEditable(t: Task) {
  return t.status === 'DRAFT' || t.status === 'WAITING_DATA'
}
export function readyForAcceptance(t: Draft) {
  return (
    t.checklistConfirmed &&
    t.materials.length > 0 &&
    t.materials
      .filter((m) => m.required)
      .every((m) => m.status === 1 && !!m.actualAt && !!m.evidenceRef.trim())
  )
}
export function timing(t: Task, now: string): string {
  if (!t.acceptedAt || !t.effectiveDueAt) return '未受理'
  if (t.status === 'CANCELLED') return '已撤销（计分待审批）'
  if (t.completedAt)
    return Date.parse(t.completedAt) > Date.parse(t.effectiveDueAt) ? '逾期已交付' : '按期已交付'
  return Date.parse(now) > Date.parse(t.effectiveDueAt) ? '逾期未结' : '期限内未结'
}
export function validateDraft(d: Draft): string | null {
  if (!d.orderNumber.trim() || d.orderNumber.trim().length > 50) return '订单号必填，最多50字。'
  if (!Number.isInteger(d.round) || d.round < 1) return '评审轮次必须为正整数。'
  if (d.receivedAt && !Number.isFinite(Date.parse(d.receivedAt))) return '资料接收时间无效。'
  for (const m of d.materials) {
    if (![1, 2, 3].includes(m.status)) return '资料提交状态无效。'
    for (const time of [m.expectedAt, m.actualAt]) {
      if (time && !Number.isFinite(Date.parse(time))) return '资料时间无效。'
    }
    if (m.actualAt && Date.parse(m.actualAt) > Date.now()) return '实际补齐时间不能晚于当前时间。'
    if (!m.name.trim()) return '请填写每项资料名称。'
    if (m.status !== 1 && (!m.missingParts.trim() || !m.ownerUserId || !m.expectedAt))
      return '缺项资料须填写缺项、补交责任人和预计补齐时间。'
    if (m.status === 1 && (!m.actualAt || !m.evidenceRef.trim()))
      return '已提交资料须填写实际补齐时间和凭证引用。'
  }
  return null
}
export function validateAction(
  t: Task,
  action: Action,
  p: ActionInput,
  meta: Metadata,
): string | null {
  for (const time of [p.dueAt, p.completedAt, p.nextFeedbackAt]) {
    if (time && !Number.isFinite(Date.parse(time))) return '操作时间无效。'
  }
  if (p.completedAt && Date.parse(p.completedAt) > Date.now())
    return '实际完成时间不能晚于当前时间。'
  if (p.result && !Object.prototype.hasOwnProperty.call(resultLabels, p.result))
    return '核验结果无效。'
  if (!t.allowedActions.includes(action)) return '当前状态或权限不允许该操作。'
  if (action === 'accept') {
    if (!readyForAcceptance(t)) return '受理条件待确认，或必备资料尚未齐备并附凭证。'
    if (!t.ownerUserId || !t.title.trim() || !t.receivedAt)
      return '正式受理前须填写责任人、交付要求和资料接收时间。'
    if (!meta.timezone || !meta.acceptanceRule || !meta.completionRule)
      return '时区、受理规则和完成条件须先获批准配置。'
    if (!p.dueAt || !p.basis?.trim()) return '请填写批准期限和时限依据。'
  }
  if (
    action === 'block' &&
    (!p.reason?.trim() || !p.nextAction?.trim() || !p.nextOwnerUserId || !p.nextFeedbackAt)
  )
    return '请填写阻塞事实、下一动作、协作人和反馈时间。'
  if (action === 'resume' && (!p.reason?.trim() || !p.evidenceRef?.trim()))
    return '请填写前置事项解决说明和凭证。'
  if (action === 'submit' && (!p.conclusion?.trim() || !p.completedAt || !p.evidenceRef?.trim()))
    return '请填写资料与交期核验结论、实际完成时间和评审记录引用。'
  if (action === 'verify' && (!p.result || !p.reason?.trim() || !p.evidenceRef?.trim()))
    return '请填写核验结果、依据说明和凭证。'
  return null
}

export type WorkflowCapability =
  | 'confirm-business'
  | 'request-change'
  | 'approve-change'
  | 'upload-evidence'
export type CompletionNode = 'DELIVERY' | 'BUSINESS_APPROVAL'
export interface Rule {
  ruleId: string
  ruleVersion: number
  timezone: string
  acceptanceRule: string
  completionNode: CompletionNode
  requiredMaterials: string[]
  reason: string
  evidenceRef: string
}
export interface RuleState {
  evidenceRefs?: string[]
  version: number
  requestedBy: string | null
  approvedBy: string | null
  approvedAt: string | null
  draft: Rule | null
  approved: Rule | null
  history: History[]
}
export const changeLabels = {
  DEADLINE: '改期',
  MATERIAL_CORRECTION: '受理后资料修正',
  REOPEN: '重开',
  REVIEW_AGAIN: '新轮次重评',
  CANCEL: '撤销',
  DECLINE: '不予承接',
} as const
export type ChangeType = keyof typeof changeLabels
export interface Change {
  requestId: string
  type: ChangeType
  reason: string
  evidenceRef: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedBy: string
  requestedAt: string
  requestVersion: number
  proposedDueAt: string | null
  proposedChanges: Draft | null
  originalValues: {
    status: Status
    ownerUserId: string | null
    effectiveDueAt: string | null
    verificationResult: Result | null
  }
  affectedSubmissionVersion: number | null
  decidedBy: string | null
  decidedAt: string | null
  decisionReason: string | null
  decisionEvidence: string | null
}
export interface ChangeInput {
  lockVersion: number
  type: ChangeType
  reason: string
  evidenceRef: string
  proposedDueAt?: string
  proposedChanges?: Draft
  affectedSubmissionVersion?: number
}
export interface DecisionInput {
  lockVersion: number
  requestVersion: number
  decision: 'APPROVED' | 'REJECTED'
  reason: string
  evidenceRef: string
}
export interface ConfirmationInput {
  lockVersion: number
  submissionVersion: number
  decision: 'APPROVED' | 'RETURNED'
  reason: string
  evidenceRef: string
}
export function availableChanges(t: Task): ChangeType[] {
  if (t.status === 'CANCELLED' || !t.allowedActions.includes('request-change')) return []
  const types: ChangeType[] = ['CANCEL']
  if (!t.acceptedAt) types.push('DECLINE')
  if (t.status === 'VERIFIED') {
    types.push('REOPEN')
    if (!t.reviewChildTaskId) types.push('REVIEW_AGAIN')
  } else if (t.acceptedAt) types.push('DEADLINE', 'MATERIAL_CORRECTION')
  return types
}
