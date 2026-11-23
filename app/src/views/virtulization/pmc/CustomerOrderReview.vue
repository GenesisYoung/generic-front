<script setup lang="ts">
/**
 * PMC's list of customer orders copied from the old ERP (route
 * /pmc/customer-orders). The "pending" tab shows open orders that have no
 * order audit yet; "Create audit" opens the order audit page with its create
 * dialog filled with the order number. The backend syncs every 15 minutes and
 * notifies PMC about new orders.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fmt, lan } from '@/lang'
import { useAuthStore } from '@/stores/auth'
import { customerOrderApi } from '@/features/customer-order/api'
import {
  createAuditQuery,
  reviewColor,
  reviewLabel,
  shortDateTime,
  type CustomerOrder,
  type ListView,
  type SyncState,
} from '@/features/customer-order/model'

const PAGE_SIZE = 20

const router = useRouter()
const auth = useAuthStore()
const canSync = computed(() => auth.can('menu.customerOrder.update'))
const canCreateAudit = computed(() => auth.can('menu.order-audit-task.create'))

const view = ref<ListView>('pending')
const search = ref('')
const rows = ref<CustomerOrder[]>([])
const page = ref(1)
const totalPages = ref(0)
const pendingCount = ref(0)
const loading = ref(false)
const syncing = ref(false)
const error = ref('')
const notice = ref('')
const syncState = ref<SyncState | null>(null)

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await customerOrderApi.list(view.value, page.value - 1, PAGE_SIZE, search.value)
    rows.value = result.content
    totalPages.value = result.totalPages
    pendingCount.value = result.pendingCount
  } catch (e) {
    error.value = fmt(lan.customerOrderLoadFailed, message(e))
  } finally {
    loading.value = false
  }
}

async function loadSyncState() {
  try {
    syncState.value = await customerOrderApi.syncStatus()
  } catch {
    // Only informational; the list still works.
  }
}

function switchView(next: ListView) {
  view.value = next
  page.value = 1
  void load()
}

function runSearch() {
  page.value = 1
  void load()
}

async function syncNow() {
  syncing.value = true
  error.value = ''
  notice.value = ''
  try {
    await customerOrderApi.syncNow()
    notice.value = lan.customerOrderSynced ?? ''
    await Promise.all([load(), loadSyncState()])
  } catch (e) {
    error.value = message(e)
  } finally {
    syncing.value = false
  }
}

function createAudit(order: CustomerOrder) {
  void router.push({ path: '/pmc/order-audit-task', query: createAuditQuery(order) })
}

onMounted(() => {
  void load()
  void loadSyncState()
})
</script>

<template>
  <v-container id="customer-order-review" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <div>
        <h1 class="text-h5">{{ lan.customerOrderReview }}</h1>
        <div class="text-body-2 text-medium-emphasis">{{ lan.customerOrderHint }}</div>
      </div>
      <v-spacer />
      <v-btn variant="outlined" :loading="loading" data-test="refresh" @click="load">
        {{ lan.refresh }}
      </v-btn>
      <v-btn
        v-if="canSync"
        color="primary"
        variant="tonal"
        :loading="syncing"
        data-test="sync"
        @click="syncNow"
      >
        {{ lan.customerOrderSyncNow }}
      </v-btn>
    </div>

    <div v-if="syncState" class="text-caption text-medium-emphasis mb-2" data-test="sync-state">
      {{ fmt(lan.customerOrderLastSync, shortDateTime(syncState.lastRunAt)) }}
      <span v-if="syncState.lastStatus === 'FAILED'" class="text-error">
        · {{ lan.customerOrderSyncFailedNote }}
      </span>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2" data-test="error">
      {{ error }}
    </v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" class="mb-2" closable>
      {{ notice }}
    </v-alert>

    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-btn-toggle :model-value="view" mandatory density="comfortable" variant="outlined">
        <v-btn value="pending" data-test="view-pending" @click="switchView('pending')">
          {{ fmt(lan.customerOrderPendingTab, pendingCount) }}
        </v-btn>
        <v-btn value="all" data-test="view-all" @click="switchView('all')">
          {{ lan.customerOrderAllTab }}
        </v-btn>
      </v-btn-toggle>
      <v-text-field
        v-if="view === 'all'"
        v-model="search"
        :label="lan.customerOrderSearch"
        density="compact"
        hide-details
        clearable
        style="max-width: 280px"
        data-test="search"
        @keyup.enter="runSearch"
        @click:clear="runSearch"
      />
    </div>

    <v-table density="comfortable">
      <thead>
        <tr>
          <th>{{ lan.customerOrderColOrderNo }}</th>
          <th>{{ lan.customerOrderColCustomer }}</th>
          <th>{{ lan.customerOrderColOrderDate }}</th>
          <th>{{ lan.customerOrderColDelivery }}</th>
          <th class="text-end">{{ lan.customerOrderColLines }}</th>
          <th class="text-end">{{ lan.customerOrderColQty }}</th>
          <th>{{ lan.customerOrderColSeen }}</th>
          <th>{{ lan.customerOrderColReview }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in rows" :key="o.id" data-test="row">
          <td>{{ o.orderNo }}</td>
          <td>{{ o.customerName || o.customerCode || '—' }}</td>
          <td>{{ o.orderDate }}</td>
          <td>{{ o.deliveryDate || '—' }}</td>
          <td class="text-end">{{ o.lineCount ?? '—' }}</td>
          <td class="text-end">{{ o.totalQty ?? '—' }}</td>
          <td>{{ shortDateTime(o.firstSeenAt) }}</td>
          <td>
            <v-chip size="small" :color="reviewColor(o)" variant="tonal">{{
              reviewLabel(o)
            }}</v-chip>
          </td>
          <td class="text-end">
            <v-btn
              v-if="o.needsReview && canCreateAudit"
              size="small"
              color="primary"
              data-test="create-audit"
              @click="createAudit(o)"
            >
              {{ lan.customerOrderCreateAudit }}
            </v-btn>
          </td>
        </tr>
        <tr v-if="!loading && rows.length === 0">
          <td colspan="9" class="text-center text-medium-emphasis py-6" data-test="empty">
            {{ view === 'pending' ? lan.customerOrderEmptyPending : lan.customerOrderEmptyAll }}
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
  </v-container>
</template>
