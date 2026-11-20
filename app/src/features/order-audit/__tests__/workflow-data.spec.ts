// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { availableChanges, emptyDraft, type Task } from '../model'
import { correctionPayload, editableDraft } from '../workflow'
const task = {
  ...emptyDraft(),
  id: '1',
  taskNumber: 'A1-1',
  lockVersion: 1,
  ownerName: '员工',
  originalDueAt: null,
  effectiveDueAt: null,
  completedAt: null,
  verificationResult: null,
  nextAction: null,
  nextOwnerUserId: null,
  nextFeedbackAt: null,
  submissions: [],
  history: [],
  status: 'TODO',
  round: 1,
  receivedAt: '2026-11-17T12:34:56.123Z',
  acceptedAt: '2026-11-17T13:00:00Z',
  allowedActions: ['request-change'],
  materials: [],
} as Task
describe('state-aware changes', () => {
  it('preserves immutable source and millisecond receipt facts through the correction form', () => {
    const editable = editableDraft(task)
    editable.receivedAt = '2000-01-01T00:00'
    editable.orderNumber = 'forged'
    editable.round = 8
    editable.orderNumber = 'ORD'
    const original = { ...task, orderNumber: 'ORD' }
    expect(correctionPayload(editable, original)).toMatchObject({
      receivedAt: task.receivedAt,
      round: 1,
      orderNumber: 'ORD',
    })
  })
  it('only offers changes appropriate to task state and avoids duplicate next rounds', () => {
    expect(availableChanges(task)).toEqual(['CANCEL', 'DEADLINE', 'MATERIAL_CORRECTION'])
    expect(availableChanges({ ...task, status: 'VERIFIED', reviewChildTaskId: '2' })).toEqual([
      'CANCEL',
      'REOPEN',
    ])
    expect(availableChanges({ ...task, status: 'CANCELLED' })).toEqual([])
    expect(availableChanges({ ...task, allowedActions: [] })).toEqual([])
  })
})
