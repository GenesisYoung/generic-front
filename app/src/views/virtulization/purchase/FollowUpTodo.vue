<script setup lang="ts">
/**
 * Purchaser's follow-up to-do list (route /purchase/followups).
 *
 * Shows my checkpoints whose window is open now, the ones ending first on top.
 * "Record follow-up" opens a dialog that saves a follow-up record; when it completes the
 * window, the row leaves the list. The backend stamps the time itself, so a
 * follow-up always counts for today's window.
 */
import { computed, onMounted, ref } from 'vue'
import { fmt, lan } from '@/lang'
import { followUpApi, type OrderFollowUps } from '@/features/purchase-followup/api'
import {
  NOTE_MAX,
  daysLeftLabel,
  emptyForm,
  materialStatusLabels,
  stageLabels,
  urgencyColor,
  validateForm,
  type FollowUpForm,
  type MaterialStatus,
  type TodoItem,
} from '@/features/purchase-followup/model'

const rows = ref<TodoItem[]>([])
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

const materialOptions = (Object.keys(materialStatusLabels) as MaterialStatus[]).map((value) => ({
  value,
  title: materialStatusLabels[value],
}))
const dueToday = computed(() => rows.value.filter((r) => r.daysLeft <= 0).length)

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
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
    const saved = await followUpApi.record(item.purchaseOrderId, form.value)
    const done = saved.completedCheckpoint?.id
    if (done != null) rows.value = rows.value.filter((r) => r.checkpointId !== done)
    notice.value =
      done != null
        ? fmt(lan.followUpSavedCheckpoint, item.poNo)
        : fmt(lan.followUpSavedExtra, item.poNo)
    showDialog.value = false
  } catch (e) {
    dialogError.value = message(e)
  } finally {
    saving.value = false
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

    <v-card variant="outlined">
      <v-progress-linear v-if="loading" indeterminate />
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>{{ lan.followUpColPoNo }}</th>
            <th>{{ lan.followUpColSupplier }}</th>
            <th>{{ lan.followUpColStage }}</th>
            <th>{{ lan.followUpColWindow }}</th>
            <th>{{ lan.followUpColDue }}</th>
            <th>{{ lan.followUpColOrderDate }}</th>
            <th>{{ lan.followUpColExpected }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rows" :key="item.checkpointId" data-test="todo-row">
            <td>{{ item.poNo }}</td>
            <td>{{ item.supplierName || item.supplierCode || '—' }}</td>
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
            </td>
          </tr>
          <tr v-if="loaded && !loading && !error && rows.length === 0">
            <td colspan="8" class="text-center text-medium-emphasis py-6" data-test="empty">
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

    <v-snackbar :model-value="!!notice" timeout="3000" @update:model-value="notice = ''">
      {{ notice }}
    </v-snackbar>
  </v-container>
</template>
