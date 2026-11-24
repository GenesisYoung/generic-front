<script setup lang="ts">
/**
 * Purchase placement tasks (route /purchase/placements). A task is made when a
 * customer order's order audit is verified with PASS; its POs must be placed
 * within 2 days. There is one role per department: anyone with
 * menu.purchaseOrder.update can take a task or give it to a colleague in their
 * department. Holders of data.purchaseOrder.all see every task; others see
 * their department's tasks and the unassigned ones. A task closes by itself at
 * the first PO the old ERP links to the order, or by hand here.
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { fmt, lan } from '@/lang'
import { useAuthStore } from '@/stores/auth'
import { placementApi } from '@/features/placement-task/api'
import {
  deadlineColor,
  deadlineLabel,
  doneLabel,
  lineCoverage,
  shortDateTime,
  validPoNo,
  type PlacementTask,
  type Purchaser,
} from '@/features/placement-task/model'

const PAGE_SIZE = 20

const auth = useAuthStore()
const canUpdate = computed(() => auth.can('menu.purchaseOrder.update'))

const openOnly = ref(true)
const rows = ref<PlacementTask[]>([])
const page = ref(1)
const totalPages = ref(0)
const canAssign = ref(false)
const loading = ref(false)
const error = ref('')
const notice = ref('')

const purchasers = ref<Purchaser[]>([])
const selected = ref<PlacementTask | null>(null)
const dialog = ref<'assign' | 'complete' | null>(null)
const form = reactive({ assigneeId: null as number | null, poNo: '' })
const dialogError = ref('')
const saving = ref(false)

const showDialog = computed({
  get: () => dialog.value !== null,
  set: (v: boolean) => {
    if (!v) dialog.value = null
  },
})

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await placementApi.list(openOnly.value, page.value - 1, PAGE_SIZE)
    rows.value = result.content
    totalPages.value = result.totalPages
    canAssign.value = result.canAssign
  } catch (e) {
    error.value = fmt(lan.placementLoadFailed, message(e))
  } finally {
    loading.value = false
  }
}

function switchView(next: boolean) {
  openOnly.value = next
  page.value = 1
  void load()
}

async function openAssign(t: PlacementTask) {
  selected.value = t
  form.assigneeId = t.assigneeId
  dialogError.value = ''
  dialog.value = 'assign'
  if (purchasers.value.length === 0) {
    try {
      purchasers.value = await placementApi.purchasers()
    } catch (e) {
      dialogError.value = message(e)
    }
  }
}

function openComplete(t: PlacementTask) {
  selected.value = t
  form.poNo = ''
  dialogError.value = ''
  dialog.value = 'complete'
}

async function save() {
  const t = selected.value
  if (!t) return
  dialogError.value = ''
  if (dialog.value === 'assign' && form.assigneeId == null) {
    dialogError.value = lan.placementChoosePurchaser ?? ''
    return
  }
  if (dialog.value === 'complete' && !validPoNo(form.poNo)) {
    dialogError.value = lan.placementPoNoInvalid ?? ''
    return
  }
  saving.value = true
  try {
    if (dialog.value === 'assign' && form.assigneeId != null) {
      const saved = await placementApi.assign(t.id, form.assigneeId)
      notice.value = fmt(lan.placementAssigned, saved.assigneeName ?? '')
    } else {
      await placementApi.complete(t.id, form.poNo.trim())
      notice.value = lan.placementCompleted ?? ''
    }
    dialog.value = null
    await load()
  } catch (e) {
    dialogError.value = message(e)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <v-container id="placement-tasks" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <div>
        <h1 class="text-h5">{{ lan.placementTasks }}</h1>
        <div class="text-body-2 text-medium-emphasis">{{ lan.placementHint }}</div>
      </div>
      <v-spacer />
      <v-btn variant="outlined" :loading="loading" data-test="refresh" @click="load">
        {{ lan.refresh }}
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2" data-test="error">
      {{ error }}
    </v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" class="mb-2" closable data-test="notice">
      {{ notice }}
    </v-alert>

    <v-btn-toggle
      :model-value="openOnly"
      mandatory
      density="comfortable"
      variant="outlined"
      class="mb-2"
    >
      <v-btn :value="true" data-test="view-open" @click="switchView(true)">
        {{ lan.placementOpenTab }}
      </v-btn>
      <v-btn :value="false" data-test="view-all" @click="switchView(false)">
        {{ lan.placementAllTab }}
      </v-btn>
    </v-btn-toggle>

    <v-table density="comfortable">
      <thead>
        <tr>
          <th>{{ lan.placementColOrderNo }}</th>
          <th>{{ lan.placementColCustomer }}</th>
          <th>{{ lan.placementColVerifiedAt }}</th>
          <th>{{ lan.placementColDeadline }}</th>
          <th>{{ lan.placementColAssignee }}</th>
          <th class="text-end" :title="lan.placementLinesHint">{{ lan.placementColLines }}</th>
          <th>{{ lan.placementColPos }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in rows" :key="t.id" data-test="row">
          <td>{{ t.orderNo }}</td>
          <td>{{ t.customerName || '—' }}</td>
          <td>{{ shortDateTime(t.auditVerifiedAt) }}</td>
          <td>
            <div>{{ shortDateTime(t.deadlineAt) }}</div>
            <v-chip size="small" :color="deadlineColor(t)" variant="tonal" data-test="deadline">
              {{ deadlineLabel(t) }}
            </v-chip>
          </td>
          <td data-test="assignee">{{ t.assigneeName || lan.placementUnassigned }}</td>
          <td class="text-end" data-test="lines">{{ lineCoverage(t) }}</td>
          <td data-test="pos">
            <div v-if="t.status === 'DONE'" class="text-success">{{ doneLabel(t) }}</div>
            <div class="text-caption text-medium-emphasis">{{ t.linkedPoNos.join(', ') }}</div>
          </td>
          <td class="text-end text-no-wrap">
            <template v-if="t.status === 'OPEN' && canUpdate">
              <v-btn
                v-if="canAssign"
                size="small"
                variant="tonal"
                class="mr-1"
                data-test="assign"
                @click="openAssign(t)"
              >
                {{ t.assigneeId ? lan.placementReassign : lan.placementAssign }}
              </v-btn>
              <v-btn
                size="small"
                color="primary"
                variant="tonal"
                data-test="complete"
                @click="openComplete(t)"
              >
                {{ lan.placementComplete }}
              </v-btn>
            </template>
          </td>
        </tr>
        <tr v-if="!loading && rows.length === 0">
          <td colspan="8" class="text-center text-medium-emphasis py-6" data-test="empty">
            {{ openOnly ? lan.placementEmptyOpen : lan.placementEmptyAll }}
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

    <v-dialog v-model="showDialog" max-width="480">
      <v-card v-if="selected">
        <v-card-title class="text-wrap">
          {{
            fmt(
              dialog === 'assign' ? lan.placementAssignTitle : lan.placementCompleteTitle,
              selected.orderNo,
            )
          }}
        </v-card-title>
        <v-card-text>
          <template v-if="dialog === 'assign'">
            <v-select
              v-model="form.assigneeId"
              :items="purchasers"
              item-title="name"
              item-value="id"
              :label="lan.placementChoosePurchaser"
              :no-data-text="lan.placementNoPurchasers"
              data-test="purchaser"
            />
          </template>
          <template v-else>
            <p class="text-body-2 mb-3">{{ lan.placementCompleteHint }}</p>
            <v-text-field
              v-model="form.poNo"
              :label="lan.placementPoNo"
              :counter="50"
              data-test="po-no"
            />
          </template>
          <v-alert v-if="dialogError" type="error" variant="tonal" data-test="dialog-error">
            {{ dialogError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="saving" @click="dialog = null">{{ lan.cancel }}</v-btn>
          <v-btn color="primary" :loading="saving" data-test="save" @click="save">
            {{ lan.save }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
