<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import {
  auditApi,
  auditWorkflowApi,
  saveDownload,
  uploadAuditEvidence,
} from '@/features/order-audit/api'
import {
  emptyDraft,
  resultLabels,
  statusLabels,
  timing,
  validateAction,
  validateDraft,
  type Action,
  type ActionInput,
  type Draft,
  type Metadata,
  type Query,
  type Task,
} from '@/features/order-audit/model'
import { historyActionLabel, historyNote } from '@/features/order-audit/history'
import OrderAuditRules from './components/OrderAuditRules.vue'
import OrderAuditWorkflow from './components/OrderAuditWorkflow.vue'
import OrderAuditDraftForm from './components/OrderAuditDraftForm.vue'
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const blankQuery = (): Query => ({
  keyword: '',
  ownerUserId: null,
  status: null,
  dueFrom: '',
  dueTo: '',
  timing: null,
  page: 1,
  size: 20,
})
const filters = ref(blankQuery())
let applied = blankQuery()
const ready = ref(false)
const showRules = ref(false)
const evidenceFile = ref<File | File[] | null>(null)
const evidencePurpose = ref('')
const uploadedEvidenceRef = ref('')
const metadata = ref<Metadata>({
  users: [],
  canCreate: false,
  timezone: null,
  acceptanceRule: null,
  completionRule: null,
})
const rows = ref<Task[]>([]),
  total = ref(0),
  sourceChecked = ref(false),
  asOf = ref(new Date().toISOString())
const loading = ref(false),
  saving = ref(false),
  detailLoading = ref(false),
  error = ref(''),
  dialogError = ref(''),
  notice = ref('')
const selected = ref<Task | null>(null),
  showDetail = ref(false),
  showEditor = ref(false),
  showAction = ref(false)
const draft = ref<Draft>(emptyDraft()),
  editId = ref<string>(),
  editVersion = ref<number>()
const action = ref<Action>('accept'),
  payload = ref<ActionInput>({ lockVersion: 0 })
const actionLabels: Record<Action, string> = {
  'check-data': '提交资料检查',
  accept: '正式受理',
  start: '开始处理',
  block: '登记阻塞',
  resume: '解除阻塞',
  submit: '提交评审成果',
  verify: '独立核验',
}
const stateOptions = Object.entries(statusLabels).map(([value, title]) => ({ value, title }))
const pages = computed(() => Math.max(1, Math.ceil(total.value / applied.size)))
const userName = (id: string | null) =>
  metadata.value.users.find((u) => u.id === id)?.name ?? id ?? '—'
const hasAction = (a: Action | 'edit') => selected.value?.allowedActions.includes(a)
let generation = 0,
  detailGeneration = 0
function message(e: unknown) {
  if (axios.isAxiosError(e)) {
    if (e.response?.status === 409)
      return '记录已被更新或存在重复来源。输入已保留，请关闭并重新打开记录核对。'
    if (e.response?.status === 404)
      return e.response.data?.message || '任务不存在或无权访问，请刷新列表。'
    if (e.response?.status === 501) return e.response.data?.message || '当前业务功能暂不可用。'
    if (!e.response) return '无法连接订单评审服务，请稍后重试。'
    return e.response?.data?.message || e.message || '请求失败，请重试。'
  }
  return e instanceof Error ? e.message : '请求失败，请重试。'
}
// datetime-local deliberately uses the browser zone, with an explicit zone label in UI.
const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone
function localDate(v: string | null | undefined) {
  if (!v) return ''
  const d = new Date(v)
  if (!Number.isFinite(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
function iso(v: string | null | undefined): string | null {
  if (!v) return null
  const d = new Date(v)
  if (!Number.isFinite(d.getTime())) throw new Error('日期时间无效')
  return d.toISOString()
}
function date(v: string | null) {
  if (!v) return '—'
  return new Date(v).toLocaleString('zh-CN', {
    timeZone: metadata.value.timezone || browserZone,
    hour12: false,
  })
}
async function load() {
  if (!ready.value) return
  const token = ++generation
  loading.value = true
  error.value = ''
  // Failed filters must never leave old rows looking like the new result.
  rows.value = []
  total.value = 0
  try {
    const data = await auditApi.list({ ...applied })
    if (token !== generation) return
    rows.value = data.items
    total.value = data.total
    sourceChecked.value = data.sourceChecked
    asOf.value = data.asOf
    if (applied.page > Math.max(1, Math.ceil(data.total / applied.size))) {
      applied.page = Math.max(1, Math.ceil(data.total / applied.size))
      filters.value.page = applied.page
      await load()
    }
  } catch (e) {
    if (token === generation) error.value = message(e)
  } finally {
    if (token === generation) loading.value = false
  }
}
async function initialize() {
  const token = ++generation
  ++detailGeneration
  rows.value = []
  total.value = 0
  error.value = ''
  showDetail.value = false
  selected.value = null
  metadata.value = {
    users: [],
    canCreate: false,
    timezone: null,
    acceptanceRule: null,
    completionRule: null,
  }
  ready.value = false
  loading.value = true
  try {
    const result = await auditApi.metadata()
    if (token !== generation) return
    metadata.value = result
    ready.value = true
    await load()
    if (token === generation) openCreateFromLink()
  } catch (e) {
    if (token === generation) {
      error.value = message(e)
      loading.value = false
    }
  }
}
async function search() {
  if (!ready.value || saving.value) return
  try {
    const q = {
      ...filters.value,
      keyword: filters.value.keyword?.trim() || '',
      page: 1,
      dueFrom: iso(filters.value.dueFrom) || '',
      dueTo: iso(filters.value.dueTo) || '',
    }
    if (q.dueFrom && q.dueTo && q.dueFrom > q.dueTo) {
      error.value = '截止期限起点不能晚于终点。'
      return
    }
    applied = q
    filters.value.page = 1
    await load()
  } catch (e) {
    error.value = message(e)
  }
}
async function reset() {
  filters.value = blankQuery()
  await search()
}
async function pageChanged(page: number) {
  applied.page = page
  filters.value.page = page
  await load()
}
async function openDetail(t: Pick<Task, 'id'>) {
  const token = ++detailGeneration
  uploadedEvidenceRef.value = ''
  evidenceFile.value = null
  evidencePurpose.value = ''
  detailLoading.value = true
  selected.value = null
  showDetail.value = true
  dialogError.value = ''
  try {
    const result = await auditApi.detail(t.id)
    if (token === detailGeneration) selected.value = result
  } catch (e) {
    if (token === detailGeneration) dialogError.value = message(e)
  } finally {
    if (token === detailGeneration) detailLoading.value = false
  }
}
async function workflowUpdated(t: Task) {
  selected.value = t
  await load()
}
async function refreshRules() {
  try {
    metadata.value = await auditApi.metadata()
  } catch (e) {
    error.value = message(e)
  }
}
async function exportList() {
  if (saving.value || !metadata.value.canExport) return
  saving.value = true
  error.value = ''
  try {
    saveDownload(await auditWorkflowApi.export({ ...applied }), '订单评审列表.csv')
  } catch (e) {
    error.value = message(e)
  } finally {
    saving.value = false
  }
}
// The customer order list links here with ?createFor=<order number>: open the
// create dialog with that number filled in, then drop the query so a reload
// does not open it again.
const route = useRoute()
const router = useRouter()
function openCreateFromLink() {
  const orderNumber = route?.query.createFor
  if (typeof orderNumber !== 'string' || !orderNumber.trim()) return
  void router?.replace({ query: { ...route.query, createFor: undefined } })
  if (!metadata.value.canCreate) return
  openEditor()
  draft.value.orderNumber = orderNumber.trim()
}
function openEditor(t?: Task) {
  draft.value = t ? clone(t) : emptyDraft()
  editId.value = t?.id
  editVersion.value = t?.lockVersion
  draft.value.receivedAt = localDate(draft.value.receivedAt)
  draft.value.materials.forEach((m) => {
    m.expectedAt = localDate(m.expectedAt)
    m.actualAt = localDate(m.actualAt)
  })
  dialogError.value = ''
  showEditor.value = true
}
async function saveDraft() {
  if (!ready.value || saving.value) return
  const validation = validateDraft(draft.value)
  if (validation) {
    dialogError.value = validation
    return
  }
  saving.value = true
  dialogError.value = ''
  try {
    // Explicit allowlist prevents detail-only fields leaking into write requests.
    const d: Draft = {
      orderNumber: draft.value.orderNumber.trim(),
      round: draft.value.round,
      title: draft.value.title,
      ownerUserId: draft.value.ownerUserId,
      receivedAt: iso(draft.value.receivedAt),
      checklistConfirmed: draft.value.checklistConfirmed,
      materials: draft.value.materials.map((m) => ({
        ...m,
        actualAt: iso(m.actualAt),
        expectedAt: iso(m.expectedAt),
      })),
    }
    selected.value = await auditApi.save(d, editId.value, editVersion.value)
    showEditor.value = false
    notice.value = '草稿已保存。'
    await load()
  } catch (e) {
    dialogError.value = message(e)
  } finally {
    saving.value = false
  }
}
function openAction(a: Action) {
  if (!selected.value) return
  action.value = a
  payload.value = { lockVersion: selected.value.lockVersion }
  dialogError.value = ''
  showAction.value = true
}
async function perform() {
  if (!ready.value || !selected.value || saving.value) return
  const validation = validateAction(selected.value, action.value, payload.value, metadata.value)
  if (validation) {
    dialogError.value = validation
    return
  }
  saving.value = true
  dialogError.value = ''
  try {
    const p = clone(payload.value)
    if (p.dueAt) p.dueAt = iso(p.dueAt)!
    if (p.completedAt) p.completedAt = iso(p.completedAt)!
    if (p.nextFeedbackAt) p.nextFeedbackAt = iso(p.nextFeedbackAt)!
    selected.value = await auditApi.act(selected.value.id, action.value, p)
    showAction.value = false
    notice.value = `${actionLabels[action.value]}已完成。`
    await load()
  } catch (e) {
    dialogError.value = message(e)
  } finally {
    saving.value = false
  }
}
async function uploadEvidence() {
  const file = Array.isArray(evidenceFile.value) ? evidenceFile.value[0] : evidenceFile.value
  if (!selected.value || saving.value) return
  if (!file || !evidencePurpose.value.trim()) {
    dialogError.value = '请选择凭证并填写用途。'
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    dialogError.value = '凭证最多20MB。'
    return
  }
  saving.value = true
  dialogError.value = ''
  try {
    const receipt = await uploadAuditEvidence(
      selected.value.id,
      file,
      evidencePurpose.value.trim(),
      selected.value.lockVersion,
    )
    uploadedEvidenceRef.value = receipt.evidenceRef
    evidenceFile.value = null
    notice.value = '凭证已上传，请将凭证编号填入对应资料或成果。'
  } catch (e) {
    dialogError.value = message(e)
  } finally {
    saving.value = false
  }
}
function closeDetail() {
  showDetail.value = false
  ++detailGeneration
}
function closeEditor() {
  showEditor.value = false
  dialogError.value = ''
}
function closeAction() {
  showAction.value = false
  dialogError.value = ''
}
onMounted(initialize)
onBeforeUnmount(() => {
  ++generation
  ++detailGeneration
})
</script>

<template>
  <v-container id="order-audit-list" fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div class="flex-grow-1">
        <h1 class="text-h5">订单评审列表</h1>
        <p class="text-body-2 mt-1">资料检查 → 正式受理 → 评审交付 → 独立核验</p>
      </div>
      <v-btn variant="outlined" :disabled="!ready || saving || loading" @click="showRules = true"
        >业务规则</v-btn
      >
      <v-btn
        v-if="metadata.canExport"
        variant="outlined"
        :disabled="!ready || saving || loading"
        @click="exportList"
        >导出筛选结果</v-btn
      >
      <v-btn
        color="primary"
        :disabled="!ready || !metadata.canCreate || loading || saving"
        @click="openEditor()"
        >新增评审</v-btn
      >
    </div>
    <v-alert
      v-if="ready && (!metadata.acceptanceRule || !metadata.completionRule || !metadata.timezone)"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      评审业务规则尚未批准。可先保存草稿、补充资料；正式受理前须由授权人员完成规则批准。
    </v-alert>
    <div v-if="ready" class="text-body-2 mb-4">
      受理条件：{{ metadata.acceptanceRule || '待批准' }}；完成条件：{{
        metadata.completionRule || '待批准'
      }}。
      <span class="text-caption"
        >列表时间：{{ metadata.timezone || browserZone }}；表单时间：{{ browserZone }}。</span
      >
    </div>
    <v-card variant="outlined" class="pa-4 mb-4">
      <form @submit.prevent="search">
        <v-row density="comfortable">
          <v-col cols="12" sm="6" md="3"
            ><v-text-field
              v-model="filters.keyword"
              label="订单号／任务编号"
              clearable
              @click:clear="filters.keyword = ''"
          /></v-col>
          <v-col cols="12" sm="6" md="3"
            ><v-select
              v-model="filters.ownerUserId"
              label="责任人"
              :items="metadata.users"
              item-title="name"
              item-value="id"
              clearable
          /></v-col>
          <v-col cols="12" sm="6" md="3"
            ><v-select v-model="filters.status" label="任务状态" :items="stateOptions" clearable
          /></v-col>
          <v-col cols="12" sm="6" md="3"
            ><v-select
              v-model="filters.timing"
              label="期限情况"
              :items="['未受理', '逾期未结', '期限内未结', '逾期已交付', '按期已交付']"
              clearable
          /></v-col>
          <v-col cols="12" sm="6" md="4"
            ><v-text-field v-model="filters.dueFrom" label="批准截止期限起点" type="datetime-local"
          /></v-col>
          <v-col cols="12" sm="6" md="4"
            ><v-text-field v-model="filters.dueTo" label="批准截止期限终点" type="datetime-local"
          /></v-col>
          <v-col cols="12" md="4" class="d-flex align-center ga-2"
            ><v-btn type="submit" color="primary" :disabled="!ready || loading || saving"
              >查询</v-btn
            ><v-btn variant="text" :disabled="!ready || loading || saving" @click="reset"
              >重置</v-btn
            ><v-btn variant="text" :disabled="!ready || loading || saving" @click="initialize"
              >刷新</v-btn
            ></v-col
          >
        </v-row>
      </form>
      <p class="text-caption">
        工作类型固定为订单评审。默认优先显示逾期、临期未结任务；未受理任务不属于到期评审分母。
      </p>
    </v-card>
    <v-alert v-if="error" type="error" class="mb-4" role="alert"
      >{{ error
      }}<v-btn variant="text" :disabled="loading" @click="initialize">重试</v-btn></v-alert
    >
    <v-progress-linear v-if="loading" indeterminate aria-label="正在加载订单评审" />
    <v-card variant="outlined">
      <v-table class="audit-table" hover>
        <thead>
          <tr>
            <th>任务／订单</th>
            <th>责任人</th>
            <th>资料检查</th>
            <th>状态／核验</th>
            <th>当前批准期限</th>
            <th>实际完成／期限情况</th>
            <th>下一动作</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in rows" :key="t.id">
            <td>
              <strong>{{ t.taskNumber }}</strong>
              <div>{{ t.orderNumber }} · 第{{ t.round }}轮</div>
            </td>
            <td>{{ t.ownerName || '待认领' }}</td>
            <td>
              {{
                !t.checklistConfirmed || !t.materials.length
                  ? '受理条件待确认'
                  : `必备已交 ${t.materials.filter((m) => m.required && m.status === 1).length}/${t.materials.filter((m) => m.required).length}`
              }}
            </td>
            <td>
              <v-chip size="small" :color="t.status === 'BLOCKED' ? 'warning' : undefined">{{
                statusLabels[t.status] || t.status
              }}</v-chip>
              <div v-if="t.verificationResult">{{ resultLabels[t.verificationResult] }}</div>
            </td>
            <td>{{ date(t.effectiveDueAt) }}</td>
            <td>
              {{ date(t.completedAt) }}
              <div :class="timing(t, asOf).startsWith('逾期') ? 'text-error' : ''">
                {{ timing(t, asOf) }}
              </div>
            </td>
            <td>
              {{ t.nextAction || '—' }}
              <div v-if="t.nextFeedbackAt">
                {{ userName(t.nextOwnerUserId) }} · {{ date(t.nextFeedbackAt) }}
              </div>
            </td>
            <td>
              <v-btn size="small" variant="text" :disabled="saving" @click="openDetail(t)"
                >查看处理</v-btn
              >
            </td>
          </tr>
          <tr v-if="!rows.length && !loading">
            <td colspan="8" class="text-center pa-8">
              {{
                error
                  ? '加载失败，请重试'
                  : !ready
                    ? '正在获取订单评审资料'
                    : !sourceChecked
                      ? '来源尚未核对，当前无匹配任务'
                      : '暂无匹配任务'
              }}
            </td>
          </tr>
        </tbody>
      </v-table>
      <div class="d-flex flex-wrap align-center ga-3 pa-3">
        <span>共 {{ total }} 条{{ sourceChecked ? '' : '（来源尚未核对）' }}</span>
        <v-select
          v-model="filters.size"
          :items="[20, 50, 100]"
          label="每页"
          density="compact"
          hide-details
          class="page-size"
          :disabled="loading || saving || !ready"
          @update:model-value="search"
        />
        <v-pagination
          :model-value="filters.page"
          :length="pages"
          :total-visible="5"
          :disabled="loading || saving || !ready"
          @update:model-value="pageChanged"
        />
      </div>
    </v-card>

    <v-dialog
      v-model="showDetail"
      max-width="1000"
      :persistent="saving || showAction || showEditor"
    >
      <v-card title="订单评审详情">
        <v-card-text>
          <v-progress-linear v-if="detailLoading" indeterminate />
          <v-alert v-if="dialogError && !showAction && !showEditor" type="error">{{
            dialogError
          }}</v-alert>
          <template v-if="selected">
            <h2 class="text-h6">{{ selected.orderNumber }} · 第{{ selected.round }}轮</h2>
            <p>
              {{ selected.taskNumber }} · {{ selected.ownerName || '待认领' }} ·
              {{ statusLabels[selected.status] }}
              {{
                selected.verificationResult ? `／${resultLabels[selected.verificationResult]}` : ''
              }}
            </p>
            <p class="my-2 preserve">交付要求：{{ selected.title || '待填写' }}</p>
            <v-row class="my-2"
              ><v-col cols="12" sm="6"
                >接收：{{ date(selected.receivedAt) }}<br />正式受理：{{
                  date(selected.acceptedAt)
                }}</v-col
              ><v-col cols="12" sm="6"
                >原批准期限：{{ date(selected.originalDueAt) }}<br />当前批准期限：{{
                  date(selected.effectiveDueAt)
                }}<br />实际完成：{{ date(selected.completedAt) }}</v-col
              ></v-row
            >
            <v-alert
              v-if="selected.status === 'BLOCKED'"
              type="warning"
              variant="tonal"
              class="mb-3"
              >外部阻塞不自动暂停计时。{{ selected.nextAction }} ·
              {{ userName(selected.nextOwnerUserId) }} ·
              {{ date(selected.nextFeedbackAt) }}</v-alert
            >
            <v-card
              v-if="selected.allowedActions.includes('upload-evidence')"
              variant="outlined"
              class="pa-3 mb-4"
            >
              <h3 class="text-subtitle-1">上传本任务凭证</h3>
              <p class="text-caption mb-2">
                PDF、PNG、JPEG或UTF-8文本，最多20MB。上传后将返回的编号填入对应资料或成果。
              </p>
              <v-file-input
                v-model="evidenceFile"
                label="凭证文件"
                accept=".pdf,.png,.jpg,.jpeg,.txt"
                :disabled="saving"
              />
              <v-text-field
                v-model="evidencePurpose"
                label="凭证用途"
                maxlength="1000"
                :disabled="saving"
              />
              <v-btn :loading="saving" @click="uploadEvidence">上传凭证</v-btn>
              <v-text-field
                v-if="uploadedEvidenceRef"
                :model-value="uploadedEvidenceRef"
                label="已上传凭证编号（可选中复制）"
                readonly
                class="mt-3"
              />
            </v-card>
            <h3 class="text-subtitle-1">资料清单</h3>
            <p v-if="!selected.checklistConfirmed || !selected.materials.length">
              受理条件待确认。
            </p>
            <v-list lines="three"
              ><v-list-item
                v-for="m in selected.materials"
                :key="m.id"
                :title="`${m.name}${m.required ? '（必备）' : ''} · ${m.status === 1 ? '已提交' : m.status === 2 ? '部分提交' : '尚未提交'}`"
              >
                <p class="preserve">
                  缺项／原因：{{ m.missingParts || '—' }} · 补交责任人：{{
                    userName(m.ownerUserId)
                  }}
                </p>
                <p>预计：{{ date(m.expectedAt) }} · 实际：{{ date(m.actualAt) }}</p>
                <p class="preserve">凭证：{{ m.evidenceRef || '—' }}</p>
              </v-list-item></v-list
            >
            <h3 class="text-subtitle-1">成果版本（A1）</h3>
            <p v-if="!selected.submissions.length">尚无成果。</p>
            <v-card
              v-for="s in selected.submissions"
              :key="s.version"
              variant="tonal"
              class="pa-3 my-2"
              ><strong>第{{ s.version }}版</strong>
              <p class="preserve">{{ s.conclusion }}</p>
              <p>
                员工填报：{{ date(s.reportedCompletedAt || s.completedAt) }} · 完成节点：{{
                  date(s.completedAt)
                }}<br />系统提交：{{ date(s.submittedAt) }}
              </p>
              <p class="preserve">评审记录：{{ s.evidenceRef }}</p></v-card
            >
            <OrderAuditWorkflow
              :key="selected.id"
              :task="selected"
              :metadata="metadata"
              @updated="workflowUpdated"
              @busy="saving = $event"
              @open-task="openDetail({ id: $event })"
            />
            <h3 class="text-subtitle-1 mt-4">操作历史</h3>
            <p v-if="!selected.history.length">暂无历史记录。</p>
            <p v-for="(h, i) in selected.history" :key="i" class="my-2 preserve">
              {{ date(h.at) }} · {{ h.actor }} · {{ historyActionLabel(h.action) }}<br />{{
                historyNote(h, { date, person: userName })
              }}
            </p>
            <div class="d-flex flex-wrap ga-2 mt-4">
              <v-btn
                v-if="hasAction('edit')"
                :disabled="saving"
                variant="outlined"
                @click="openEditor(selected)"
                >编辑资料</v-btn
              >
              <v-btn
                v-for="a in Object.keys(actionLabels) as Action[]"
                v-show="hasAction(a)"
                :disabled="saving"
                :key="a"
                color="primary"
                variant="tonal"
                @click="openAction(a)"
                >{{ actionLabels[a] }}</v-btn
              >
            </div>
          </template>
        </v-card-text>
        <v-card-actions
          ><v-spacer /><v-btn :disabled="saving" @click="closeDetail">关闭</v-btn></v-card-actions
        >
      </v-card>
    </v-dialog>
    <v-dialog v-model="showEditor" max-width="900" persistent>
      <v-card :title="editId ? '编辑评审资料' : '新增订单评审草稿'">
        <v-card-text
          ><p class="mb-3">
            时间按 {{ browserZone }} 输入。正式受理由授权主管执行；不在此直接填写期限。
          </p>
          <v-alert v-if="dialogError" type="error" class="mb-3" role="alert">{{
            dialogError
          }}</v-alert
          ><OrderAuditDraftForm
            v-model="draft"
            :users="metadata.users"
            :disabled="saving"
            :editing="!!editId"
            :key="editId || 'new'"
            :task-id="editId"
            :lock-version="editVersion"
            :can-upload-task="!!selected?.allowedActions.includes('upload-evidence')"
            @busy="saving = $event"
        /></v-card-text>
        <v-card-actions
          ><v-spacer /><v-btn :disabled="saving" @click="closeEditor">取消</v-btn
          ><v-btn color="primary" :loading="saving" @click="saveDraft"
            >保存草稿</v-btn
          ></v-card-actions
        >
      </v-card>
    </v-dialog>
    <v-dialog v-model="showAction" max-width="700" persistent>
      <v-card :title="actionLabels[action]">
        <v-card-text>
          <v-alert v-if="dialogError" type="error" class="mb-3" role="alert">{{
            dialogError
          }}</v-alert>
          <p class="mb-3">时间按 {{ browserZone }} 输入。</p>
          <fieldset :disabled="saving" class="action-fields">
            <template v-if="action === 'accept'"
              ><v-alert type="info" variant="tonal" class="mb-3"
                >{{
                  metadata.acceptanceRule || '受理规则待确认'
                }}。原定期限在正式受理时固定。</v-alert
              ><v-text-field
                v-model="payload.dueAt"
                type="datetime-local"
                label="批准评审截止时间 *" /><v-textarea
                v-model="payload.basis"
                label="时限及批准依据 *"
                rows="3"
            /></template>
            <template v-if="action === 'block'"
              ><v-textarea v-model="payload.reason" label="阻塞事实 *" rows="2" /><v-text-field
                v-model="payload.nextAction"
                label="下一动作 *"
              /><v-select
                v-model="payload.nextOwnerUserId"
                :items="metadata.users"
                item-title="name"
                item-value="id"
                label="协作人 *"
              /><v-text-field
                v-model="payload.nextFeedbackAt"
                type="datetime-local"
                label="下一反馈时间 *"
              />
              <p>阻塞不暂停计时，不修改批准期限。</p></template
            >
            <template v-if="action === 'resume' || action === 'verify'"
              ><v-select
                v-if="action === 'verify'"
                v-model="payload.result"
                label="核验结果 *"
                :items="
                  Object.entries(resultLabels).map(([value, title]) => ({ value, title }))
                " /><v-textarea
                v-model="payload.reason"
                :label="action === 'resume' ? '前置事项解决说明 *' : '核验依据说明 *'"
                rows="3" /><v-text-field
                v-model="payload.evidenceRef"
                label="凭证编号（可在凭证管理上传后复制） *"
            /></template>
            <template v-if="action === 'submit'"
              ><v-textarea
                v-model="payload.conclusion"
                label="资料与交期核验结论及依据 *"
                rows="4"
              /><v-text-field
                v-model="payload.completedAt"
                type="datetime-local"
                label="实际完成时间 *"
              /><v-text-field
                v-model="payload.evidenceRef"
                label="评审凭证编号（可在凭证管理上传后复制） *"
              />
              <p>提交生成新成果版本；系统记录提交时间，核验时间独立记录。</p></template
            >
            <p v-if="action === 'verify'">
              本人提交的成果必须由另一名授权人员核验。“不符合”仍为已核验；“需补证”退回；“归责争议”保持待核验。
            </p>
            <p v-if="action === 'check-data'">
              提交后进入待补／待受理队列；资料齐备仍需主管正式受理，不会自动开始评审计时。
            </p>
            <p v-if="action === 'start'">确认开始执行本轮订单评审。</p>
          </fieldset>
        </v-card-text>
        <v-card-actions
          ><v-spacer /><v-btn :disabled="saving" @click="closeAction">取消</v-btn
          ><v-btn color="primary" :loading="saving" @click="perform"
            >确认{{ actionLabels[action] }}</v-btn
          ></v-card-actions
        >
      </v-card>
    </v-dialog>
    <OrderAuditRules
      v-model="showRules"
      :metadata="metadata"
      @changed="refreshRules"
      @busy="saving = $event"
    />
    <v-snackbar :model-value="!!notice" @update:model-value="notice = ''" :timeout="4000"
      >{{ notice
      }}<template #actions><v-btn @click="notice = ''">关闭</v-btn></template></v-snackbar
    >
  </v-container>
</template>
<style scoped>
.audit-table :deep(th),
.audit-table :deep(td) {
  white-space: nowrap;
  padding: 12px 16px;
}
.audit-table :deep(td:first-child),
.audit-table :deep(td:nth-child(7)) {
  white-space: normal;
  min-width: 170px;
  overflow-wrap: anywhere;
}
.page-size {
  max-width: 110px;
  min-width: 100px;
}
.preserve {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.action-fields {
  border: 0;
  min-width: 0;
  padding: 0;
}
</style>
