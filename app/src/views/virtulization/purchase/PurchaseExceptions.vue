<script setup lang="ts">
/**
 * Purchasing exceptions (route /purchase/exceptions). Purchasers report
 * supplier problems; PMC, Planning and Operations acknowledge, work on and
 * propose a resolution; the PMC department approves it (or rejects it with a
 * reason) before it counts as resolved; the reporter or the purchasing
 * manager closes it. PMC members get an "Awaiting PMC approval" tab (also
 * opened by ?view=approval from the approval notification). Every
 * step is alerted in real time by the backend. The buttons shown come from
 * the backend's allowedActions, so the page never offers a step the user
 * cannot take.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fmt, lan } from '@/lang'
import { exceptionApi } from '@/features/purchase-exception/api'
import ExceptionReportDialog from '@/features/purchase-exception/ExceptionReportDialog.vue'
import {
  actionColor,
  actionNeedsText,
  actionTakesText,
  approvalColor,
  label,
  pendingApproval,
  severityColor,
  shortDateTime,
  statusColor,
  TEXT_MAX,
  type ExceptionAction,
  type ListView,
  type PurchaseException,
} from '@/features/purchase-exception/model'

const PAGE_SIZE = 20

const route = useRoute()
const view = ref<ListView>(route?.query?.view === 'approval' ? 'approval' : 'open')
const rows = ref<PurchaseException[]>([])
const page = ref(1)
const totalPages = ref(0)
const openCount = ref(0)
const canReport = ref(false)
const approvalCount = ref(0)
const canApprove = ref(false)
const loading = ref(false)
const error = ref('')
const notice = ref('')

const showReport = ref(false)
const selected = ref<PurchaseException | null>(null)
const showDetail = computed({
  get: () => selected.value !== null,
  set: (v: boolean) => {
    if (!v) selected.value = null
  },
})
const comment = ref('')
const acting = ref<ExceptionAction | null>(null)
const detailError = ref('')

/** Buttons in the detail dialog: every allowed action except COMMENT, which has its own button. */
const stepActions = computed(() =>
  (selected.value?.allowedActions ?? []).filter((a) => a !== 'COMMENT'),
)
const canComment = computed(() => selected.value?.allowedActions.includes('COMMENT') ?? false)
const pending = computed(() => (selected.value ? pendingApproval(selected.value) : null))
const emptyText = computed(() =>
  view.value === 'approval'
    ? lan.exceptionEmptyApproval
    : view.value === 'open'
      ? lan.exceptionEmptyOpen
      : lan.exceptionEmptyAll,
)

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await exceptionApi.list(view.value, page.value - 1, PAGE_SIZE)
    rows.value = result.content
    totalPages.value = result.totalPages
    openCount.value = result.openCount
    canReport.value = result.canReport
    approvalCount.value = result.approvalCount ?? 0
    canApprove.value = result.canApprove ?? false
  } catch (e) {
    error.value = fmt(lan.exceptionLoadFailed, message(e))
  } finally {
    loading.value = false
  }
}

function switchView(next: ListView) {
  view.value = next
  page.value = 1
  void load()
}

async function open(row: PurchaseException) {
  comment.value = ''
  detailError.value = ''
  try {
    selected.value = await exceptionApi.detail(row.id)
  } catch (e) {
    error.value = message(e)
  }
}

function onReported(saved: PurchaseException) {
  notice.value = fmt(lan.exceptionReported, saved.exceptionNo)
  void load()
}

async function act(action: ExceptionAction) {
  const current = selected.value
  if (!current) return
  detailError.value = ''
  if (actionNeedsText(action) && !comment.value.trim()) {
    detailError.value = lan[`exceptionNeedText_${action}`] ?? ''
    return
  }
  if (comment.value.trim().length > TEXT_MAX) {
    detailError.value = lan.exceptionTextTooLong ?? ''
    return
  }
  acting.value = action
  try {
    const text = actionTakesText(action) ? comment.value : ''
    selected.value = await exceptionApi.act(current.id, action, text, current.lockVersion)
    comment.value = ''
    void load()
  } catch (e) {
    detailError.value = message(e)
  } finally {
    acting.value = null
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <v-container id="purchase-exceptions" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <div>
        <h1 class="text-h5">{{ lan.purchaseExceptions }}</h1>
        <div class="text-body-2 text-medium-emphasis">{{ lan.exceptionHint }}</div>
      </div>
      <v-spacer />
      <v-btn variant="outlined" :loading="loading" data-test="refresh" @click="load">
        {{ lan.refresh }}
      </v-btn>
      <v-btn
        v-if="canReport"
        color="error"
        variant="tonal"
        data-test="report"
        @click="showReport = true"
      >
        {{ lan.exceptionReport }}
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2" data-test="error">
      {{ error }}
    </v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" class="mb-2" closable data-test="notice">
      {{ notice }}
    </v-alert>

    <v-btn-toggle
      :model-value="view"
      mandatory
      density="comfortable"
      variant="outlined"
      class="mb-2"
    >
      <v-btn value="open" data-test="view-open" @click="switchView('open')">
        {{ fmt(lan.exceptionOpenTab, openCount) }}
      </v-btn>
      <v-btn
        v-if="canApprove"
        value="approval"
        data-test="view-approval"
        @click="switchView('approval')"
      >
        {{ fmt(lan.exceptionApprovalTab, approvalCount) }}
      </v-btn>
      <v-btn value="all" data-test="view-all" @click="switchView('all')">
        {{ lan.exceptionAllTab }}
      </v-btn>
    </v-btn-toggle>

    <v-table density="comfortable">
      <thead>
        <tr>
          <th>{{ lan.exceptionColNo }}</th>
          <th>{{ lan.exceptionPoNo }}</th>
          <th>{{ lan.exceptionColSupplier }}</th>
          <th>{{ lan.exceptionCategory }}</th>
          <th>{{ lan.exceptionColDescription }}</th>
          <th>{{ lan.exceptionImpactDate }}</th>
          <th>{{ lan.exceptionColReporter }}</th>
          <th>{{ lan.exceptionColHandler }}</th>
          <th>{{ lan.exceptionColStatus }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="x in rows" :key="x.id" class="cursor-pointer" data-test="row" @click="open(x)">
          <td>
            <div>{{ x.exceptionNo }}</div>
            <div class="text-caption text-medium-emphasis">{{ shortDateTime(x.reportedAt) }}</div>
          </td>
          <td>{{ x.poNo }}</td>
          <td>{{ x.supplierName || '—' }}</td>
          <td>
            <v-chip size="small" :color="severityColor(x.severity)" variant="tonal">
              {{ label('Severity', x.severity) }}
            </v-chip>
            {{ label('Category', x.category) }}
          </td>
          <td class="text-truncate" style="max-width: 280px">{{ x.description }}</td>
          <td>{{ x.impactDate || '—' }}</td>
          <td>{{ x.reporterName || '—' }}</td>
          <td>{{ x.handlerName || '—' }}</td>
          <td>
            <v-chip size="small" :color="statusColor(x.status)" data-test="status">
              {{ label('Status', x.status) }}
            </v-chip>
          </td>
        </tr>
        <tr v-if="!loading && rows.length === 0">
          <td colspan="9" class="text-center text-medium-emphasis py-6" data-test="empty">
            {{ emptyText }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-pagination
      v-if="totalPages > 1"
      v-model="page"
      :length="totalPages"
      class="mt-2"
      density="comfortable"
      @update:model-value="load"
    />

    <ExceptionReportDialog v-model="showReport" @reported="onReported" />

    <v-dialog v-model="showDetail" max-width="640">
      <v-card v-if="selected" data-test="detail">
        <v-card-title class="d-flex align-center ga-2 flex-wrap">
          {{ selected.exceptionNo }}
          <v-chip size="small" :color="statusColor(selected.status)">
            {{ label('Status', selected.status) }}
          </v-chip>
          <v-chip size="small" :color="severityColor(selected.severity)" variant="tonal">
            {{ label('Severity', selected.severity) }}
          </v-chip>
        </v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-2">
            {{ selected.poNo }} · {{ selected.supplierName || '—' }} ·
            {{ label('Category', selected.category) }}
            <span v-if="selected.impactDate">
              · {{ fmt(lan.exceptionAffects, selected.impactDate) }}</span
            >
          </div>
          <p class="mb-3" style="white-space: pre-wrap">{{ selected.description }}</p>
          <v-alert
            v-if="pending"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
            data-test="pending-approval"
          >
            {{
              fmt(
                lan.exceptionApprovalPending,
                pending.requestedByName || pending.requestedBy,
                shortDateTime(pending.requestedAt),
                pending.proposedResolution,
              )
            }}
            <div v-if="selected.allowedActions.includes('APPROVE')" class="text-caption mt-1">
              {{ lan.exceptionApprovalHint }}
            </div>
          </v-alert>
          <v-alert
            v-else-if="selected.resolution"
            type="success"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            {{ fmt(lan.exceptionResolution, selected.resolution) }}
          </v-alert>

          <div class="text-subtitle-2 mb-1">{{ lan.exceptionHistory }}</div>
          <div
            v-for="(h, i) in selected.history"
            :key="i"
            class="text-body-2 text-medium-emphasis"
            data-test="history"
          >
            {{ shortDateTime(h.createdAt) }} · {{ h.operatorName || h.operatorId }} ·
            {{ label('Action', h.action) }}
            <span v-if="h.comment">: {{ h.comment }}</span>
          </div>

          <template v-if="selected.approvals?.length">
            <div class="text-subtitle-2 mt-3 mb-1">{{ lan.exceptionApprovals }}</div>
            <div
              v-for="ap in selected.approvals"
              :key="ap.id"
              class="text-body-2 text-medium-emphasis"
              data-test="approval"
            >
              <v-chip size="x-small" :color="approvalColor(ap.status)" class="mr-1">
                {{ label('Approval', ap.status) }}
              </v-chip>
              {{
                fmt(
                  lan.exceptionApprovalLine,
                  shortDateTime(ap.requestedAt),
                  ap.requestedByName || ap.requestedBy,
                  ap.proposedResolution,
                )
              }}
              <div v-if="ap.decidedAt" class="ml-4">
                {{
                  fmt(
                    lan.exceptionApprovalDecided,
                    label('Approval', ap.status),
                    ap.decidedByName || ap.decidedBy || '',
                    shortDateTime(ap.decidedAt),
                  )
                }}
                <span v-if="ap.decisionComment">: {{ ap.decisionComment }}</span>
              </div>
            </div>
          </template>

          <template v-if="selected.allowedActions.length">
            <v-textarea
              v-model="comment"
              :label="lan.exceptionComment"
              :counter="TEXT_MAX"
              rows="2"
              class="mt-4"
              data-test="comment"
            />
            <v-alert v-if="detailError" type="error" variant="tonal" data-test="detail-error">
              {{ detailError }}
            </v-alert>
          </template>
        </v-card-text>
        <v-card-actions class="flex-wrap">
          <v-btn
            v-if="canComment"
            variant="text"
            :loading="acting === 'COMMENT'"
            data-test="act-COMMENT"
            @click="act('COMMENT')"
          >
            {{ lan.exceptionDo_COMMENT }}
          </v-btn>
          <v-spacer />
          <v-btn
            v-for="a in stepActions"
            :key="a"
            :color="actionColor(a)"
            variant="tonal"
            :loading="acting === a"
            :data-test="`act-${a}`"
            @click="act(a)"
          >
            {{ lan[`exceptionDo_${a}`] }}
          </v-btn>
          <v-btn @click="selected = null">{{ lan.close }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
