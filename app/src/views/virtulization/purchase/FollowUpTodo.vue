<script setup lang="ts">
/**
 * Purchaser's follow-up to-do list (route /purchase/followups).
 *
 * Shows my follow-up tasks whose window is open now, the ones ending first on
 * top. Each task comes from the order's follow-up template. "Complete
 * follow-up" saves a follow-up record for that one task and marks it complete,
 * so the row leaves the list. "Change template" switches the order to another
 * template and re-plans its open tasks. When an order's lines belong to
 * plan groups that are followed up on their own, each group has its own task
 * (shown with the group's name); the chips above the table filter by group.
 */
import { computed, onMounted, ref } from 'vue'
import { fmt, lan } from '@/lang'
import { followUpApi, type OrderFollowUps } from '@/features/purchase-followup/api'
import { templateApi } from '@/features/followup-template/api'
import type { FollowUpTemplate } from '@/features/followup-template/model'
import { useAuthStore } from '@/stores/auth'
import ExceptionReportDialog from '@/features/purchase-exception/ExceptionReportDialog.vue'
import type { PurchaseException } from '@/features/purchase-exception/model'
import {
  NOTE_MAX,
  daysLeftLabel,
  emptyForm,
  filterBySeries,
  groupsInList,
  materialStatusLabels,
  seriesLabel,
  stageLabels,
  urgencyColor,
  validateForm,
  type FollowUpForm,
  type MaterialStatus,
  type SeriesFilter,
  type TodoItem,
} from '@/features/purchase-followup/model'

const rows = ref<TodoItem[]>([])
const seriesFilter = ref<SeriesFilter>('ALL')
const groupChips = computed(() => groupsInList(rows.value))
const mainCount = computed(() => rows.value.filter((i) => i.planGroupId == null).length)
const shown = computed(() => filterBySeries(rows.value, seriesFilter.value))
const auth = useAuthStore()
const canReport = computed(() => auth.can('menu.purchaseException.create'))
const canChangeTemplate = computed(() => auth.can('menu.purchaseOrder.update'))
const reportFor = ref<TodoItem | null>(null)
const showReport = computed({
  get: () => reportFor.value !== null,
  set: (v: boolean) => {
    if (!v) reportFor.value = null
  },
})
const loading = ref(false)
const error = ref('')
const notice = ref('')
const loaded = ref(false)

const selected = ref<TodoItem | null>(null)
const showDialog = ref(false)
const form = ref<FollowUpForm>(emptyForm())
const saving = ref(false)
const dialogError = ref('')
const history = ref<OrderFollowUps | null>(null)

const templates = ref<FollowUpTemplate[]>([])
const templateFor = ref<TodoItem | null>(null)
const showTemplate = computed({
  get: () => templateFor.value !== null,
  set: (v: boolean) => {
    if (!v) templateFor.value = null
  },
})
const templateId = ref<number | null>(null)
const templateError = ref('')
const applying = ref(false)

const materialOptions = (Object.keys(materialStatusLabels) as MaterialStatus[]).map((value) => ({
  value,
  title: materialStatusLabels[value],
}))
const dueToday = computed(() => rows.value.filter((r) => r.daysLeft <= 0).length)

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
}

function onReported(saved: PurchaseException) {
  notice.value = fmt(lan.exceptionReported, saved.exceptionNo)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await followUpApi.todo()
  } catch (e) {
    error.value = fmt(lan.followUpLoadFailed, message(e))
  } finally {
    loading.value = false
    loaded.value = true
  }
}

async function openDialog(item: TodoItem) {
  selected.value = item
  form.value = emptyForm()
  dialogError.value = ''
  history.value = null
  showDialog.value = true
  try {
    history.value = await followUpApi.orderFollowUps(item.purchaseOrderId)
  } catch {
    // The history is a convenience; saving still works without it.
  }
}

async function save() {
  const item = selected.value
  if (!item) return
  dialogError.value = validateForm(form.value)
  if (dialogError.value) return
  saving.value = true
  try {
    await followUpApi.complete(item.checkpointId, form.value)
    rows.value = rows.value.filter((r) => r.checkpointId !== item.checkpointId)
    notice.value = fmt(lan.followUpSavedCheckpoint, item.poNo)
    showDialog.value = false
  } catch (e) {
    dialogError.value = message(e)
  } finally {
    saving.value = false
  }
}

async function openTemplate(item: TodoItem) {
  templateFor.value = item
  templateId.value = item.templateId
  templateError.value = ''
  if (templates.value.length === 0) {
    try {
      templates.value = await templateApi.list()
    } catch (e) {
      templateError.value = message(e)
    }
  }
}

async function applyTemplate() {
  const item = templateFor.value
  if (!item) return
  const chosen = templates.value.find((t) => t.id === Number(templateId.value))
  if (!chosen) {
    templateError.value = lan.followUpChooseTemplate ?? ''
    return
  }
  applying.value = true
  templateError.value = ''
  try {
    const open = await templateApi.applyToOrder(item.purchaseOrderId, chosen.id, item.planGroupId)
    notice.value = fmt(lan.followUpTemplateChanged, item.poNo, chosen.name, open)
    templateFor.value = null
    await load()
  } catch (e) {
    templateError.value = message(e)
  } finally {
    applying.value = false
  }
}

onMounted(load)
</script>

<template>
  <v-container id="follow-up-todo" fluid>
    <div class="d-flex flex-wrap align-center ga-3 mb-4">
      <div class="flex-grow-1">
        <h1 class="text-h5">{{ lan.followUpTodo }}</h1>
        <p class="text-body-2 mt-1">
          {{ lan.followUpHint }}
        </p>
      </div>
      <v-btn variant="outlined" :loading="loading" data-test="refresh" @click="load">{{
        lan.refresh
      }}</v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <div v-if="loaded && !error" class="text-body-2 mb-2" data-test="summary">
      {{ fmt(lan.followUpSummary, rows.length, dueToday) }}
    </div>

    <v-chip-group
      v-if="groupChips.length > 0"
      v-model="seriesFilter"
      mandatory
      selected-class="text-primary"
      class="mb-2"
      data-test="series-filter"
    >
      <v-chip value="ALL" filter data-test="filter-all">
        {{ fmt(lan.followUpFilterAll, rows.length) }}
      </v-chip>
      <v-chip value="MAIN" filter data-test="filter-main">
        {{ fmt(lan.followUpFilterMain, mainCount) }}
      </v-chip>
      <v-chip
        v-for="g in groupChips"
        :key="g.id"
        :value="g.id"
        filter
        :data-test="`filter-group-${g.id}`"
      >
        {{ g.name }} ({{ g.count }})
      </v-chip>
    </v-chip-group>

    <v-card variant="outlined">
      <v-progress-linear v-if="loading" indeterminate />
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>{{ lan.followUpColPoNo }}</th>
            <th>{{ lan.followUpColSeries }}</th>
            <th>{{ lan.followUpColSupplier }}</th>
            <th>{{ lan.followUpColTemplate }}</th>
            <th>{{ lan.followUpColStage }}</th>
            <th>{{ lan.followUpColWindow }}</th>
            <th>{{ lan.followUpColDue }}</th>
            <th>{{ lan.followUpColOrderDate }}</th>
            <th>{{ lan.followUpColExpected }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in shown" :key="item.checkpointId" data-test="todo-row">
            <td>{{ item.poNo }}</td>
            <td data-test="series">
              <v-chip
                size="small"
                :color="item.planGroupId == null ? undefined : 'teal'"
                :variant="item.planGroupId == null ? 'outlined' : 'tonal'"
              >
                {{ seriesLabel(item) }}
              </v-chip>
            </td>
            <td>{{ item.supplierName || item.supplierCode || '—' }}</td>
            <td data-test="template">{{ item.templateName || '—' }}</td>
            <td>{{ stageLabels[item.stage] }} · {{ fmt(lan.followUpNth, item.seq) }}</td>
            <td>{{ item.windowStart }} ~ {{ item.windowEnd }}</td>
            <td>
              <v-chip size="small" :color="urgencyColor(item)">{{
                daysLeftLabel(item.daysLeft)
              }}</v-chip>
            </td>
            <td>{{ item.orderDate }}</td>
            <td>{{ item.expectedDeliveryDate || '—' }}</td>
            <td class="text-right">
              <v-btn
                size="small"
                color="primary"
                variant="tonal"
                data-test="record"
                @click="openDialog(item)"
                >{{ lan.followUpRecord }}</v-btn
              >
              <v-btn
                v-if="canChangeTemplate"
                size="small"
                variant="text"
                class="ml-1"
                data-test="change-template"
                @click="openTemplate(item)"
                >{{ lan.followUpChangeTemplate }}</v-btn
              >
              <v-btn
                v-if="canReport"
                size="small"
                color="error"
                variant="text"
                class="ml-1"
                data-test="report-exception"
                @click="reportFor = item"
                >{{ lan.exceptionReport }}</v-btn
              >
            </td>
          </tr>
          <tr v-if="loaded && !loading && !error && rows.length === 0">
            <td colspan="10" class="text-center text-medium-emphasis py-6" data-test="empty">
              {{ lan.followUpEmpty }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-dialog v-model="showDialog" max-width="560">
      <v-card v-if="selected">
        <v-card-title>{{ lan.followUpRecord }} · {{ selected.poNo }}</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">
            {{ selected.supplierName || selected.supplierCode || '' }} · {{ lan.followUpWindow }}
            {{ selected.windowStart }} ~ {{ selected.windowEnd }}
          </p>
          <v-select
            v-model="form.materialStatus"
            :items="materialOptions"
            :label="lan.followUpMaterialStatus"
            data-test="material-status"
          />
          <v-text-field
            v-model="form.supplierPromisedDate"
            type="date"
            :label="lan.followUpPromisedDate"
            data-test="promised-date"
          />
          <v-checkbox
            v-model="form.missingOrderFound"
            :label="lan.followUpMissingOrder"
            hide-details
          />
          <v-textarea
            v-model="form.note"
            :label="lan.followUpNote"
            :counter="NOTE_MAX"
            rows="3"
            data-test="note"
          />
          <v-alert
            v-if="dialogError"
            type="error"
            variant="tonal"
            class="mt-2"
            data-test="dialog-error"
          >
            {{ dialogError }}
          </v-alert>
          <div v-if="history && history.records.length" class="mt-4" data-test="history">
            <div class="text-subtitle-2 mb-1">{{ lan.followUpRecent }}</div>
            <div
              v-for="r in history.records.slice(0, 5)"
              :key="r.id"
              class="text-body-2 text-medium-emphasis"
            >
              {{ r.followedUpAt.replace('T', ' ').slice(0, 16) }} · {{ r.recordedByName || '' }} ·
              {{ materialStatusLabels[r.materialStatus] }}
              <span v-if="r.supplierPromisedDate">
                · {{ fmt(lan.followUpPromised, r.supplierPromisedDate) }}</span
              >
              <span v-if="r.note"> · {{ r.note }}</span>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="saving" @click="showDialog = false">{{ lan.cancel }}</v-btn>
          <v-btn color="primary" :loading="saving" data-test="save" @click="save">{{
            lan.save
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTemplate" max-width="480">
      <v-card v-if="templateFor" data-test="template-dialog">
        <v-card-title class="text-wrap">
          {{ fmt(lan.followUpChangeTemplateTitle, templateFor.poNo) }}
          <span v-if="templateFor.planGroupId != null"> · {{ seriesLabel(templateFor) }}</span>
        </v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-3">{{ lan.followUpChangeTemplateHint }}</p>
          <v-select
            v-model="templateId"
            :items="templates"
            item-title="name"
            item-value="id"
            :label="lan.followUpChooseTemplate"
            data-test="template-select"
          />
          <v-alert v-if="templateError" type="error" variant="tonal" data-test="template-error">
            {{ templateError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="applying" @click="templateFor = null">{{ lan.cancel }}</v-btn>
          <v-btn
            color="primary"
            :loading="applying"
            data-test="apply-template"
            @click="applyTemplate"
          >
            {{ lan.save }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ExceptionReportDialog
      v-model="showReport"
      :purchase-order-id="reportFor?.purchaseOrderId ?? null"
      :po-no="reportFor?.poNo ?? ''"
      @reported="onReported"
    />

    <v-snackbar :model-value="!!notice" timeout="3000" @update:model-value="notice = ''">
      {{ notice }}
    </v-snackbar>
  </v-container>
</template>
