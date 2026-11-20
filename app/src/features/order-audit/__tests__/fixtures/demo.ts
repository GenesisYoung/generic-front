import type { AuditApi } from '../../api'
import {
  emptyDraft,
  isEditable,
  timing,
  validateAction,
  validateDraft,
  resultLabels,
  type Action,
  type Metadata,
  type Task,
} from '../../model'
export const demoMetadata: Metadata = {
  users: [
    { id: 'demo-pmc', name: '演示PMC' },
    { id: 'demo-reviewer', name: '演示独立核验人' },
  ],
  canCreate: true,
  timezone: 'Asia/Shanghai',
  acceptanceRule: '演示：必备资料齐备后主管受理',
  completionRule: '演示：合格评审成果交付（均未作为正式业务规则）',
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
function actions(t: Task): Task['allowedActions'] {
  switch (t.status) {
    case 'DRAFT':
    case 'WAITING_DATA':
      return ['edit', 'check-data', 'accept']
    case 'TODO':
      return ['start', 'block', 'submit']
    case 'IN_PROGRESS':
      return ['block', 'submit']
    case 'BLOCKED':
      return ['resume', 'submit']
    case 'RETURNED':
      return ['submit']
    case 'SUBMITTED':
      return ['verify']
    default:
      return []
  }
}
/** Fresh, in-memory sandbox on every entry. It never writes business storage. */
export function createDemoApi(): AuditApi {
  let sequence = 1
  let records: Task[] = []
  function resolve(id: string) {
    const t = records.find((t) => t.id === id)
    if (!t) throw new Error('记录不存在')
    return t
  }
  function expose(t: Task) {
    return clone({ ...t, allowedActions: actions(t) })
  }
  const api: AuditApi = {
    async metadata() {
      return clone(demoMetadata)
    },
    async list(q) {
      let items = records.filter(
        (t) =>
          (!q.keyword ||
            `${t.orderNumber} ${t.taskNumber}`.toLowerCase().includes(q.keyword.toLowerCase())) &&
          (!q.ownerUserId || t.ownerUserId === q.ownerUserId) &&
          (!q.status || t.status === q.status) &&
          (!q.dueFrom ||
            (!!t.effectiveDueAt && Date.parse(t.effectiveDueAt) >= Date.parse(q.dueFrom))) &&
          (!q.dueTo ||
            (!!t.effectiveDueAt && Date.parse(t.effectiveDueAt) <= Date.parse(q.dueTo))) &&
          (!q.timing || timing(t, new Date().toISOString()) === q.timing),
      )
      items = items.sort((a, b) => {
        const open = (t: Task) => !!t.acceptedAt && !t.completedAt && t.status !== 'CANCELLED'
        return (
          Number(open(b)) - Number(open(a)) ||
          (Date.parse(a.effectiveDueAt || '') || Infinity) -
            (Date.parse(b.effectiveDueAt || '') || Infinity) ||
          a.id.localeCompare(b.id)
        )
      })
      return {
        items: items.slice((q.page - 1) * q.size, q.page * q.size).map(expose),
        total: items.length,
        sourceChecked: false,
        asOf: new Date().toISOString(),
      }
    },
    async detail(id) {
      return expose(resolve(id))
    },
    async save(d, id, version) {
      const error = validateDraft(d)
      if (error) throw new Error(error)
      if (
        records.some(
          (t) => t.id !== id && t.orderNumber === d.orderNumber.trim() && t.round === d.round,
        )
      )
        throw new Error('订单号与评审轮次重复')
      let t: Task
      if (id) {
        t = resolve(id)
        if (version !== t.lockVersion) throw new Error('记录已更新，请重新打开后修改')
        if (!isEditable(t)) throw new Error('正式受理后不可直接修改资料和期限')
        Object.assign(t, clone(d))
      } else {
        const key = String(sequence++)
        t = {
          ...clone(d),
          id: key,
          taskNumber: `DEMO-A1-${key.padStart(4, '0')}`,
          status: 'DRAFT',
          lockVersion: 0,
          ownerName: null,
          acceptedAt: null,
          originalDueAt: null,
          effectiveDueAt: null,
          completedAt: null,
          verificationResult: null,
          nextAction: null,
          nextOwnerUserId: null,
          nextFeedbackAt: null,
          submissions: [],
          history: [],
          allowedActions: [],
        }
        records.push(t)
      }
      t.orderNumber = d.orderNumber.trim()
      t.ownerName = demoMetadata.users.find((u) => u.id === d.ownerUserId)?.name ?? null
      t.lockVersion++
      t.history.push({
        at: new Date().toISOString(),
        actor: '演示PMC',
        action: id ? '修改草稿' : '建立草稿',
        note: '临时演示记录',
      })
      return expose(t)
    },
    async act(id, action: Action, p) {
      const t = resolve(id)
      if (t.lockVersion !== p.lockVersion) throw new Error('版本冲突，请重新打开记录')
      const error = validateAction(expose(t), action, p, demoMetadata)
      if (error) throw new Error(error)
      const now = new Date().toISOString()
      switch (action) {
        case 'check-data':
          t.status = 'WAITING_DATA'
          break
        case 'accept':
          t.status = 'TODO'
          t.acceptedAt = now
          t.originalDueAt = p.dueAt!
          t.effectiveDueAt = p.dueAt!
          break
        case 'start':
          t.status = 'IN_PROGRESS'
          break
        case 'block':
          t.status = 'BLOCKED'
          t.nextAction = p.nextAction!
          t.nextOwnerUserId = p.nextOwnerUserId!
          t.nextFeedbackAt = p.nextFeedbackAt!
          break
        case 'resume':
          t.status = 'IN_PROGRESS'
          t.nextAction = null
          t.nextOwnerUserId = null
          t.nextFeedbackAt = null
          break
        case 'submit':
          t.status = 'SUBMITTED'
          t.completedAt = p.completedAt!
          t.verificationResult = null
          t.submissions.push({
            version: t.submissions.length + 1,
            conclusion: p.conclusion!,
            evidenceRef: p.evidenceRef!,
            completedAt: p.completedAt!,
            submittedAt: now,
            submittedBy: 'demo-pmc',
          })
          break
        case 'verify':
          t.verificationResult = p.result!
          t.status =
            p.result === 'NEED_PROOF'
              ? 'RETURNED'
              : p.result === 'DISPUTED'
                ? 'SUBMITTED'
                : 'VERIFIED'
          break
      }
      t.lockVersion++
      t.history.push({
        at: now,
        actor: action === 'verify' || action === 'accept' ? '演示独立核验人' : '演示PMC',
        action,
        note: [
          p.result ? resultLabels[p.result] : '',
          p.reason || p.basis || p.conclusion || '资料检查完成；齐备仍需主管正式受理',
          p.evidenceRef ? `凭证：${p.evidenceRef}` : '',
        ]
          .filter(Boolean)
          .join('；'),
      })
      return expose(t)
    },
  }
  // Clearly fictional fixtures cover waiting, overdue, submitted and verified failures.
  const make = (id: string, status: Task['status'], hours: number | null): Task => {
    const due = hours === null ? null : new Date(Date.now() + hours * 3600000).toISOString()
    const t: Task = {
      ...emptyDraft(),
      id,
      taskNumber: `DEMO-A1-${id}`,
      orderNumber: `演示订单-${id}`,
      title: '核对资料及交期，交付评审记录',
      round: 1,
      ownerUserId: 'demo-pmc',
      ownerName: '演示PMC',
      receivedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      status,
      lockVersion: 1,
      checklistConfirmed: true,
      materials: [
        {
          id: `${id}-m1`,
          name: '演示包装规格（正式清单待确认）',
          required: true,
          status: hours === null ? 2 : 1,
          missingParts: hours === null ? '包装尺寸' : '',
          ownerUserId: 'demo-pmc',
          expectedAt: new Date().toISOString(),
          actualAt: hours === null ? null : new Date(Date.now() - 2 * 86400000).toISOString(),
          evidenceRef: hours === null ? '' : 'DEMO-资料-001',
        },
      ],
      acceptedAt: due ? new Date(Date.now() - 86400000).toISOString() : null,
      originalDueAt: due,
      effectiveDueAt: due,
      completedAt: null,
      verificationResult: null,
      nextAction: null,
      nextOwnerUserId: null,
      nextFeedbackAt: null,
      submissions: [],
      history: [],
      allowedActions: [],
    }
    if (status === 'SUBMITTED' || status === 'VERIFIED') {
      t.completedAt = new Date().toISOString()
      t.submissions = [
        {
          version: 1,
          completedAt: t.completedAt,
          submittedAt: t.completedAt,
          submittedBy: 'demo-pmc',
          conclusion: '演示：已核对资料及交期',
          evidenceRef: 'DEMO-评审-001',
        },
      ]
    }
    if (status === 'VERIFIED') t.verificationResult = 'FAIL'
    return t
  }
  records = [
    make('101', 'WAITING_DATA', null),
    make('102', 'IN_PROGRESS', -12),
    make('103', 'TODO', 24),
    make('104', 'SUBMITTED', -4),
    make('105', 'VERIFIED', 12),
  ]
  return api
}
