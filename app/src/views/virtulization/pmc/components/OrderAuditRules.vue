<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { auditWorkflowApi, saveDownload } from '@/features/order-audit/api'
import type { History, Metadata, Rule, RuleState } from '@/features/order-audit/model'
import { clone, errorMessage, validateRule } from '@/features/order-audit/workflow'
import { historyActionLabel, historyNote } from '@/features/order-audit/history'
const show = defineModel<boolean>({ required: true })
const props = defineProps<{ metadata: Metadata }>()
const emit = defineEmits<{ changed: []; busy: [boolean] }>()
const state = ref<RuleState | null>(null),
  loading = ref(false),
  saving = ref(false),
  error = ref(''),
  message = ref('')
const edit = ref(false),
  decision = ref<'APPROVED' | 'REJECTED'>('APPROVED'),
  reason = ref(''),
  proof = ref(''),
  names = ref('')
const form = ref<Rule>({
  ruleId: 'default',
  ruleVersion: 0,
  timezone: '',
  acceptanceRule: '',
  completionNode: 'DELIVERY',
  requiredMaterials: [],
  reason: '',
  evidenceRef: '',
})
const date = (v: string | null) =>
  v
    ? new Date(v).toLocaleString('zh-CN', {
        timeZone: props.metadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
    : '—'
const person = (id: string) => props.metadata.users.find((u) => u.id === id)?.name || id
const ruleProofs = computed(() => [
  ...new Set(
    [
      ...(state.value?.evidenceRefs || []),
      state.value?.draft?.evidenceRef,
      state.value?.approved?.evidenceRef,
    ].filter((v): v is string => !!v),
  ),
])
async function downloadProof(ref: string) {
  if (saving.value) return
  saving.value = true
  emit('busy', true)
  error.value = ''
  try {
    const file = await auditWorkflowApi.downloadRuleEvidence(ref)
    saveDownload(file.blob, file.filename)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
    emit('busy', false)
  }
}
function historicalRule(h: History): Rule | null {
  const value = h.action === 'rule-REJECTED' ? h.before : h.after
  if (!value || typeof value !== 'object') return null
  const rule = value as Partial<Rule>
  return typeof rule.acceptanceRule === 'string' && Array.isArray(rule.requiredMaterials)
    ? (rule as Rule)
    : null
}
async function load() {
  loading.value = true
  error.value = ''
  edit.value = false
  try {
    state.value = await auditWorkflowApi.rules()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(
  show,
  (value) => {
    if (value) {
      message.value = ''
      reason.value = ''
      proof.value = ''
      void load()
    }
  },
  { immediate: true },
)
function beginEdit() {
  const current = state.value?.draft || state.value?.approved
  form.value = current
    ? clone(current)
    : {
        ruleId: 'default',
        ruleVersion: 0,
        timezone: '',
        acceptanceRule: '',
        completionNode: 'DELIVERY',
        requiredMaterials: [],
        reason: '',
        evidenceRef: '',
      }
  form.value.ruleVersion = state.value!.version
  names.value = form.value.requiredMaterials.join('\n')
  edit.value = true
  error.value = ''
}
async function save() {
  if (saving.value || !state.value) return
  const rule = {
    ...form.value,
    requiredMaterials: names.value
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
  }
  const invalid = validateRule(rule)
  if (invalid) {
    error.value = invalid
    return
  }
  saving.value = true
  emit('busy', true)
  error.value = ''
  try {
    state.value = await auditWorkflowApi.saveRule(rule)
    edit.value = false
    message.value = '规则草稿已提交，请由另一名授权人员批准。'
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
    emit('busy', false)
  }
}
async function approve() {
  if (saving.value || !state.value) return
  if (!reason.value.trim() || !proof.value.trim()) {
    error.value = '请填写批准／驳回说明和凭证。'
    return
  }
  saving.value = true
  emit('busy', true)
  error.value = ''
  try {
    state.value = await auditWorkflowApi.decideRule({
      ruleVersion: state.value.version,
      decision: decision.value,
      reason: reason.value,
      evidenceRef: proof.value,
    })
    message.value =
      decision.value === 'APPROVED'
        ? '规则已批准，后续正式受理将使用该版本。'
        : '规则草稿已驳回，原批准规则继续有效。'
    reason.value = ''
    proof.value = ''
    emit('changed')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
    emit('busy', false)
  }
}
</script>
<template>
  <v-dialog v-model="show" max-width="1000" :persistent="saving || edit">
    <v-card title="订单评审业务规则">
      <v-card-text>
        <v-progress-linear v-if="loading" indeterminate />
        <v-alert v-if="error" type="error" class="mb-3">{{ error }}</v-alert>
        <v-alert v-if="message" type="success" class="mb-3">{{ message }}</v-alert>
        <v-btn variant="text" :disabled="saving || loading" @click="load"
          >重新读取规则（放弃未保存编辑）</v-btn
        >
        <template v-if="state">
          <v-alert type="info" variant="tonal" class="my-3"
            >新规则批准后用于后续受理，已受理任务沿用自己的规则快照。规则提交人不可自行批准。</v-alert
          >
          <h3 class="text-subtitle-1">当前批准规则</h3>
          <p v-if="!state.approved">尚无批准规则，可保存任务草稿，暂不能正式受理。</p>
          <div v-else class="my-3 preserve">
            <p>
              版本 {{ state.approved.ruleVersion }} · {{ date(state.approvedAt) }} · 批准人
              {{ person(state.approvedBy || '') }}
            </p>
            <p>
              时区：{{ state.approved.timezone }}；受理条件：{{ state.approved.acceptanceRule }}
            </p>
            <p>
              完成节点：{{
                state.approved.completionNode === 'DELIVERY' ? '合格成果交付' : '主管业务确认通过'
              }}
            </p>
            <p>必备资料：{{ state.approved.requiredMaterials.join('、') }}</p>
            <p>依据：{{ state.approved.reason }} · 凭证：{{ state.approved.evidenceRef }}</p>
          </div>
          <v-card v-if="state.draft" variant="tonal" class="pa-3 my-3">
            <h3 class="text-subtitle-1">
              待批准草稿 · 提交人 {{ person(state.requestedBy || '') }}
            </h3>
            <p class="preserve">{{ state.draft.acceptanceRule }}</p>
            <p>
              时区：{{ state.draft.timezone }}；完成节点：{{
                state.draft.completionNode === 'DELIVERY' ? '合格成果交付' : '主管业务确认通过'
              }}
            </p>
            <p>必备资料：{{ state.draft.requiredMaterials.join('、') }}</p>
            <p class="preserve">
              依据：{{ state.draft.reason }} · 凭证：{{ state.draft.evidenceRef }}
            </p>
            <template
              v-if="
                metadata.canApproveRules &&
                metadata.currentUserId &&
                state.requestedBy !== metadata.currentUserId &&
                !edit
              "
            >
              <v-select
                v-model="decision"
                :items="[
                  { title: '批准', value: 'APPROVED' },
                  { title: '驳回', value: 'REJECTED' },
                ]"
                label="审批结论"
                :disabled="saving"
              />
              <v-textarea
                v-model="reason"
                label="审批说明 *"
                rows="2"
                maxlength="4000"
                :disabled="saving"
              /><v-text-field v-model="proof" label="审批凭证编号 *" :disabled="saving" />
              <v-btn color="primary" :loading="saving" @click="approve">提交规则审批</v-btn>
            </template>
            <p v-else-if="state.requestedBy === metadata.currentUserId">
              等待另一名有规则批准权限的人员处理。
            </p>
          </v-card>
          <v-btn
            v-if="metadata.canConfigureRules && !edit"
            variant="outlined"
            :disabled="saving"
            @click="beginEdit"
            >{{ state.draft ? '修改待批准草稿' : '建立规则草稿' }}</v-btn
          >
          <fieldset v-if="edit" :disabled="saving" class="fields my-3">
            <v-text-field
              v-model="form.timezone"
              label="业务时区 *"
              placeholder="例如 Asia/Shanghai，须由业务确认"
            />
            <v-textarea
              v-model="form.acceptanceRule"
              label="受理条件 *"
              maxlength="4000"
              rows="3"
            />
            <v-select
              v-model="form.completionNode"
              label="批准完成节点"
              :items="[
                { title: '合格成果交付', value: 'DELIVERY' },
                { title: '主管业务确认通过', value: 'BUSINESS_APPROVAL' },
              ]"
            />
            <v-textarea v-model="names" label="必备资料名称，每行一项 *" rows="5" />
            <v-textarea
              v-model="form.reason"
              label="规则制定／修改依据 *"
              rows="2"
              maxlength="4000"
            />
            <v-text-field v-model="form.evidenceRef" label="本人受控凭证编号 *" />
            <p class="text-caption mb-3">
              可在“凭证管理”独立上传本人依据文件并复制编号，也可引用本人已有的有效附件。
            </p>
            <v-btn color="primary" :loading="saving" @click="save">保存待批准草稿</v-btn
            ><v-btn :disabled="saving" @click="edit = false">取消编辑</v-btn>
          </fieldset>
          <h3 class="text-subtitle-1 mt-4">规则关联凭证</h3>
          <div v-for="ref in ruleProofs" :key="ref" class="my-2 preserve">
            {{ ref }}
            <v-btn
              v-if="
                ref.startsWith('evidence:') &&
                (metadata.canConfigureRules || metadata.canApproveRules)
              "
              size="small"
              variant="text"
              :disabled="saving"
              @click="downloadProof(ref)"
              >下载规则凭证</v-btn
            >
            <span v-else class="text-caption">按原凭证所属入口查看</span>
          </div>
          <h3 class="text-subtitle-1 mt-4">规则变更历史</h3>
          <p v-for="(h, i) in state.history" :key="i" class="preserve my-2">
            {{ date(h.at) }} · {{ h.actor }} ·
            {{
              h.action === 'rule-draft'
                ? '提交规则草稿'
                : h.action === 'rule-APPROVED'
                  ? '批准规则'
                  : h.action === 'rule-REJECTED'
                    ? '驳回规则'
                    : historyActionLabel(h.action)
            }}<br />{{ historyNote(h, { date, person }) }}
          </p>
          <template v-for="(h, i) in state.history" :key="`snapshot-${i}`">
            <details v-if="historicalRule(h)" class="my-2">
              <summary>{{ date(h.at) }} · 查看当次规则内容</summary>
              <p>
                时区：{{ historicalRule(h)?.timezone }}；受理条件：{{
                  historicalRule(h)?.acceptanceRule
                }}
              </p>
              <p>
                完成节点：{{
                  historicalRule(h)?.completionNode === 'DELIVERY'
                    ? '合格成果交付'
                    : '主管业务确认通过'
                }}
              </p>
              <p>必备资料：{{ historicalRule(h)?.requiredMaterials.join('、') }}</p>
            </details>
          </template>
        </template>
      </v-card-text>
      <v-card-actions
        ><v-spacer /><v-btn :disabled="saving" @click="show = false">关闭</v-btn></v-card-actions
      >
    </v-card>
  </v-dialog>
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
