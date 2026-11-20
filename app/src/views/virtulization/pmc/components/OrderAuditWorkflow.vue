<script setup lang="ts">
import { computed, ref } from 'vue'
import { auditWorkflowApi, saveDownload } from '@/features/order-audit/api'
import {
  availableChanges,
  changeLabels,
  validateDraft,
  type Change,
  type ChangeInput,
  type ChangeType,
  type ConfirmationInput,
  type Draft,
  type Metadata,
  type Submission,
  type Task,
} from '@/features/order-audit/model'
import {
  correctionPayload,
  editableDraft,
  errorMessage,
  toInstant,
} from '@/features/order-audit/workflow'
import OrderAuditDraftForm from './OrderAuditDraftForm.vue'
const props = defineProps<{ task: Task; metadata: Metadata }>()
const emit = defineEmits<{ updated: [Task]; busy: [boolean]; openTask: [string] }>()
const busy = ref(false),
  error = ref(''),
  notice = ref(''),
  show = ref(false)
const mode = ref<'confirm' | 'request' | 'decision'>('request'),
  type = ref<ChangeType>('DEADLINE'),
  decision = ref<'APPROVED' | 'REJECTED' | 'RETURNED'>('APPROVED')
const reason = ref(''),
  proof = ref(''),
  due = ref(''),
  currentChange = ref<Change | null>(null),
  correction = ref<Draft | null>(null)
const snapshot = ref<Submission | null>(null),
  snapshotOpen = ref(false)
const choices = computed(() =>
  availableChanges(props.task).map((value) => ({ value, title: changeLabels[value] })),
)
const changes = computed(() => props.task.changeRequests || [])
const latest = computed(() => props.task.submissions[props.task.submissions.length - 1])
const date = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString('zh-CN', {
        timeZone: props.metadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    : '—'
const person = (id: string | null | undefined) =>
  props.metadata.users.find((u) => u.id === id)?.name || id || '—'
const canDecide = (c: Change) =>
  props.task.allowedActions.includes('approve-change') &&
  c.status === 'PENDING' &&
  !!props.metadata.currentUserId &&
  c.requestedBy !== props.metadata.currentUserId
function close() {
  show.value = false
  error.value = ''
}
function open(m: typeof mode.value, c?: Change) {
  mode.value = m
  currentChange.value = c || null
  reason.value = ''
  proof.value = ''
  due.value = ''
  decision.value = 'APPROVED'
  error.value = ''
  type.value = choices.value[0]?.value || 'CANCEL'
  correction.value = editableDraft(props.task)
  show.value = true
}
async function run(work: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  emit('busy', true)
  error.value = ''
  notice.value = ''
  try {
    await work()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
    emit('busy', false)
  }
}
async function submit() {
  if (!reason.value.trim() || !proof.value.trim()) {
    error.value = '请填写说明和凭证编号。'
    return
  }
  await run(async () => {
    let result: Task
    if (mode.value === 'confirm') {
      if (!latest.value) throw new Error('尚无待确认成果。')
      result = await auditWorkflowApi.confirm(props.task.id, {
        lockVersion: props.task.lockVersion,
        submissionVersion: latest.value.version,
        decision: decision.value as ConfirmationInput['decision'],
        reason: reason.value,
        evidenceRef: proof.value,
      })
    } else if (mode.value === 'request') {
      const input: ChangeInput = {
        lockVersion: props.task.lockVersion,
        type: type.value,
        reason: reason.value,
        evidenceRef: proof.value,
      }
      if (type.value === 'DEADLINE') input.proposedDueAt = toInstant(due.value)
      if (type.value === 'MATERIAL_CORRECTION') {
        if (!correction.value) throw new Error('请填写修正内容。')
        const invalid = validateDraft(correction.value)
        if (invalid) throw new Error(invalid)
        input.proposedChanges = correctionPayload(correction.value, props.task)
      }
      if (latest.value) input.affectedSubmissionVersion = latest.value.version
      result = await auditWorkflowApi.requestChange(props.task.id, input)
    } else {
      if (!currentChange.value) throw new Error('请重新打开申请。')
      result = await auditWorkflowApi.decideChange(props.task.id, currentChange.value.requestId, {
        lockVersion: props.task.lockVersion,
        requestVersion: currentChange.value.requestVersion,
        decision: decision.value as 'APPROVED' | 'REJECTED',
        reason: reason.value,
        evidenceRef: proof.value,
      })
    }
    emit('updated', result)
    show.value = false
    notice.value = '操作已保存，任务及历史已更新。'
  })
}
async function inspect(version: number) {
  await run(async () => {
    snapshot.value = await auditWorkflowApi.snapshot(props.task.id, version)
    snapshotOpen.value = true
  })
}
async function download(ref: string) {
  await run(async () => {
    const file = await auditWorkflowApi.download(props.task.id, ref)
    saveDownload(file.blob, file.filename)
  })
}
const proofRefs = computed(() => {
  const refs = new Set<string>()
  const add = (v: string | null | undefined) => {
    if (v) refs.add(v)
  }
  props.task.materials.forEach((m) => add(m.evidenceRef))
  props.task.submissions.forEach((s) => {
    add(s.evidenceRef)
    s.materialsSnapshot?.forEach((m) => add(m.evidenceRef))
    s.verificationRecords?.forEach((v) => add(v.evidenceRef))
    s.businessConfirmations?.forEach((c) => add(c.evidenceRef))
  })
  changes.value.forEach((c) => {
    add(c.evidenceRef)
    add(c.decisionEvidence)
    c.proposedChanges?.materials.forEach((m) => add(m.evidenceRef))
  })
  return [...refs]
})
</script>
<template>
  <section class="mt-4">
    <v-alert v-if="error && !show" type="error" class="mb-3">{{ error }}</v-alert>
    <v-alert v-if="notice" type="success" class="mb-3">{{ notice }}</v-alert>
    <v-alert
      v-if="
        task.status === 'SUBMITTED' &&
        task.acceptanceRuleSnapshot?.completionNode === 'BUSINESS_APPROVAL' &&
        !task.completedAt
      "
      type="info"
      variant="tonal"
      class="mb-3"
      >本轮完成条件是主管业务确认通过。确认前保留员工填报时间，尚未形成批准节点完成时间。</v-alert
    >
    <div class="d-flex flex-wrap ga-2 mb-3">
      <v-btn
        v-if="task.allowedActions.includes('confirm-business')"
        color="primary"
        :disabled="busy"
        @click="open('confirm')"
        >主管业务确认</v-btn
      >
      <v-btn v-if="choices.length" variant="outlined" :disabled="busy" @click="open('request')"
        >提出变更申请</v-btn
      >
      <v-btn
        v-if="task.reviewParentTaskId"
        variant="text"
        :disabled="busy"
        @click="emit('openTask', task.reviewParentTaskId)"
        >查看上一轮评审</v-btn
      >
      <v-btn
        v-if="task.reviewChildTaskId"
        variant="text"
        :disabled="busy"
        @click="emit('openTask', task.reviewChildTaskId)"
        >进入获批下一轮</v-btn
      >
    </div>
    <h3 class="text-subtitle-1">变更申请与审批</h3>
    <p v-if="!changes.length">暂无变更申请。</p>
    <v-card v-for="c in changes" :key="c.requestId" variant="outlined" class="pa-3 my-2">
      <strong
        >{{ changeLabels[c.type] }} ·
        {{
          c.status === 'PENDING' ? '待审批' : c.status === 'APPROVED' ? '已批准' : '已驳回'
        }}</strong
      >
      <p>申请人：{{ person(c.requestedBy) }} · {{ date(c.requestedAt) }}</p>
      <p class="preserve">申请说明：{{ c.reason }} · 凭证：{{ c.evidenceRef }}</p>
      <p v-if="c.type === 'DEADLINE'">
        申请时批准期限：{{ date(c.originalValues.effectiveDueAt) }} → 申请新期限：{{
          date(c.proposedDueAt)
        }}
      </p>
      <div v-if="c.proposedChanges">
        <p>
          修正后的责任人：{{ person(c.proposedChanges.ownerUserId) }}；交付要求：{{
            c.proposedChanges.title
          }}
        </p>
        <p v-for="m in c.proposedChanges.materials" :key="m.id" class="preserve">
          {{ m.name }} · {{ m.required ? '必备' : '非必备' }} ·
          {{ m.status === 1 ? '已提交' : m.status === 2 ? '部分提交' : '尚未提交' }} · 缺项：{{
            m.missingParts || '—'
          }}
          · 补交人：{{ person(m.ownerUserId) }} · 预计：{{ date(m.expectedAt) }} · 实际：{{
            date(m.actualAt)
          }}
          · 凭证：{{ m.evidenceRef || '—' }}
        </p>
      </div>
      <p v-if="c.decidedAt" class="preserve">
        审批人：{{ person(c.decidedBy) }} · {{ date(c.decidedAt) }}<br />审批说明：{{
          c.decisionReason
        }}
        · 凭证：{{ c.decisionEvidence }}
      </p>
      <v-btn v-if="canDecide(c)" variant="tonal" :disabled="busy" @click="open('decision', c)"
        >审批此申请</v-btn
      >
      <p
        v-else-if="c.status === 'PENDING' && c.requestedBy === metadata.currentUserId"
        class="text-caption"
      >
        等待另一名授权人员审批，本人不能自批。
      </p>
    </v-card>
    <h3 class="text-subtitle-1 mt-4">成果快照与核验依据</h3>
    <v-btn
      v-for="s in task.submissions"
      :key="s.version"
      variant="text"
      :disabled="busy"
      @click="inspect(s.version)"
      >查看第{{ s.version }}版快照</v-btn
    >
    <h3 class="text-subtitle-1 mt-4">关联凭证</h3>
    <p v-if="!proofRefs.length">尚无关联凭证。</p>
    <div v-for="ref in proofRefs" :key="ref" class="d-flex align-center ga-2">
      <span class="preserve">{{ ref }}</span
      ><v-btn
        v-if="ref.startsWith('audit:') || ref.startsWith('evidence:')"
        size="small"
        variant="text"
        :disabled="busy"
        @click="download(ref)"
        >下载</v-btn
      ><span v-else class="text-caption">已有附件，请使用原附件管理入口</span>
    </div>
    <v-dialog v-model="show" max-width="900" persistent
      ><v-card
        :title="
          mode === 'confirm' ? '主管业务确认' : mode === 'request' ? '提出变更申请' : '审批变更申请'
        "
      >
        <v-card-text
          ><v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
          <fieldset :disabled="busy" class="fields">
            <template v-if="mode === 'request'">
              <v-select v-model="type" :items="choices" label="申请事项" />
              <v-alert type="info" variant="tonal" class="mb-3"
                >提交申请不会立即改变任务。批准后，改期保留原期限；重开保留原成果；重评生成下一轮草稿；撤销保留历史。</v-alert
              >
              <v-text-field
                v-if="type === 'DEADLINE'"
                v-model="due"
                type="datetime-local"
                label="申请新截止时间 *"
              />
              <template v-if="type === 'MATERIAL_CORRECTION' && correction"
                ><p>订单、轮次和原接收事实保持不变；时间按浏览器当前时区填写。</p>
                <OrderAuditDraftForm
                  v-model="correction"
                  :users="metadata.users"
                  :disabled="busy"
                  :editing="true"
                  :lock-received="true"
              /></template>
            </template>
            <template v-else>
              <p class="mb-3">
                {{
                  mode === 'confirm'
                    ? `确认当前第${latest?.version}版成果；通过与独立核验分别记录。`
                    : `申请事项：${currentChange ? changeLabels[currentChange.type] : ''}`
                }}
              </p>
              <v-select
                v-model="decision"
                label="处理结论"
                :items="
                  mode === 'confirm'
                    ? [
                        { title: '通过', value: 'APPROVED' },
                        { title: '退回补证', value: 'RETURNED' },
                      ]
                    : [
                        { title: '批准', value: 'APPROVED' },
                        { title: '驳回', value: 'REJECTED' },
                      ]
                "
              />
            </template>
            <v-textarea
              v-model="reason"
              label="说明及依据 *"
              rows="3"
              maxlength="4000"
            /><v-text-field v-model="proof" label="凭证编号 *" />
          </fieldset> </v-card-text
        ><v-card-actions
          ><v-spacer /><v-btn :disabled="busy" @click="close">取消</v-btn
          ><v-btn color="primary" :loading="busy" @click="submit">确认提交</v-btn></v-card-actions
        >
      </v-card></v-dialog
    >
    <v-dialog v-model="snapshotOpen" max-width="950" :persistent="busy"
      ><v-card :title="`第${snapshot?.version}版成果快照`"
        ><v-card-text v-if="snapshot">
          <p class="preserve">{{ snapshot.conclusion }}</p>
          <p>
            填报完成：{{ date(snapshot.reportedCompletedAt) }}；批准节点完成：{{
              date(snapshot.completedAt)
            }}；提交：{{ date(snapshot.submittedAt) }} · {{ person(snapshot.submittedBy) }}
          </p>
          <p v-if="snapshot.ruleSnapshot">
            受理规则版本：{{ snapshot.ruleSnapshot.ruleVersion }} ·
            {{ snapshot.ruleSnapshot.acceptanceRule }}<br />完成节点：{{
              snapshot.ruleSnapshot.completionNode === 'DELIVERY'
                ? '合格成果交付'
                : '主管业务确认通过'
            }}；必备资料：{{ snapshot.ruleSnapshot.requiredMaterials.join('、') }}
          </p>
          <h3 class="text-subtitle-1 mt-3">提交时资料清单</h3>
          <p v-for="m in snapshot.materialsSnapshot" :key="m.id" class="preserve">
            {{ m.name }} · {{ m.required ? '必备' : '非必备' }} ·
            {{ m.status === 1 ? '已提交' : m.status === 2 ? '部分提交' : '尚未提交' }} · 缺项：{{
              m.missingParts || '—'
            }}
            · 实际补齐：{{ date(m.actualAt) }} · 凭证：{{ m.evidenceRef || '—' }}
          </p>
          <h3 class="text-subtitle-1 mt-3">主管业务确认</h3>
          <p v-if="!snapshot.businessConfirmations?.length">尚无业务确认记录。</p>
          <p v-for="(c, i) in snapshot.businessConfirmations" :key="i" class="preserve">
            {{ c.decision === 'APPROVED' ? '通过' : '退回' }} · {{ person(c.confirmedBy) }} ·
            {{ date(c.confirmedAt) }}<br />{{ c.reason }} · 凭证：{{ c.evidenceRef }}
          </p>
          <h3 class="text-subtitle-1 mt-3">历次独立核验</h3>
          <p v-if="!snapshot.verificationRecords?.length">尚无独立核验记录。</p>
          <p v-for="(v, i) in snapshot.verificationRecords" :key="i" class="preserve">
            {{
              v.result === 'PASS'
                ? '符合'
                : v.result === 'FAIL'
                  ? '不符合'
                  : v.result === 'NEED_PROOF'
                    ? '需补证'
                    : '归责争议'
            }}
            · {{ person(v.verifiedBy) }} · {{ date(v.verifiedAt) }}<br />{{ v.reason }} · 凭证：{{
              v.evidenceRef
            }}
          </p> </v-card-text
        ><v-card-actions
          ><v-spacer /><v-btn @click="snapshotOpen = false">关闭</v-btn></v-card-actions
        ></v-card
      ></v-dialog
    >
  </section>
</template>
<style scoped>
.fields {
  border: 0;
  padding: 0;
  min-width: 0;
}
.preserve {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
