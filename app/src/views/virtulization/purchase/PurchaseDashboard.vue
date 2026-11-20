<script setup lang="ts">
/**
 * Purchasing dashboard (route /purchase/dashboard). A purchasing manager sees
 * everyone's numbers and a table per purchaser; a purchaser sees their own
 * placement tasks, follow-ups and exceptions. Every tile opens its page.
 */
import { onMounted, ref } from 'vue'
import { fmt, lan } from '@/lang'
import { dashboardApi } from '@/features/dashboard/api'
import DashboardTiles from '@/features/dashboard/DashboardTiles.vue'
import {
  daysLeftLabel,
  purchasingTiles,
  shortDateTime,
  type PurchasingDashboard,
  type Tile,
} from '@/features/dashboard/model'

const data = ref<PurchasingDashboard | null>(null)
const tiles = ref<Tile[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await dashboardApi.purchasing()
    tiles.value = purchasingTiles(data.value)
  } catch (e) {
    error.value = fmt(lan.dash_loadFailed, e instanceof Error ? e.message : '')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <v-container id="purchase-dashboard" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <div>
        <h1 class="text-h5">{{ lan.purchaseDashboard }}</h1>
        <div v-if="data" class="text-caption text-medium-emphasis">
          {{ data.allPurchasers ? lan.dash_scopeAll : lan.dash_scopeMine }} ·
          {{ fmt(lan.dash_generatedAt, shortDateTime(data.generatedAt)) }}
        </div>
      </div>
      <v-spacer />
      <v-btn variant="outlined" :loading="loading" data-test="refresh" @click="load">
        {{ lan.refresh }}
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2" data-test="error">
      {{ error }}
    </v-alert>

    <template v-if="data">
      <DashboardTiles :tiles="tiles" />

      <v-card v-if="data.allPurchasers" class="mt-4">
        <v-card-title class="text-subtitle-1">{{ lan.dash_byPurchaser }}</v-card-title>
        <v-table density="compact">
          <thead>
            <tr>
              <th>{{ lan.placementColAssignee }}</th>
              <th class="text-end">{{ lan.dash_activeOrders }}</th>
              <th class="text-end">{{ lan.dash_followUpsDueToday }}</th>
              <th class="text-end">{{ lan.dash_followUpsMissed }}</th>
              <th class="text-end">{{ lan.dash_placementOpen }}</th>
              <th class="text-end">{{ lan.dash_placementOverdue }}</th>
              <th class="text-end">{{ lan.dash_exceptionsOpen }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.byPurchaser" :key="r.purchaserId" data-test="purchaser-row">
              <td>{{ r.name || r.purchaserId }}</td>
              <td class="text-end">{{ r.activeOrders }}</td>
              <td class="text-end">{{ r.followUpsDueToday }}</td>
              <td class="text-end" :class="{ 'text-error': r.missedLast7Days > 0 }">
                {{ r.missedLast7Days }}
              </td>
              <td class="text-end">{{ r.openPlacements }}</td>
              <td class="text-end" :class="{ 'text-error': r.overduePlacements > 0 }">
                {{ r.overduePlacements }}
              </td>
              <td class="text-end">{{ r.openExceptions }}</td>
            </tr>
            <tr v-if="data.byPurchaser.length === 0">
              <td colspan="7" class="text-medium-emphasis">{{ lan.dash_noPurchasers }}</td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-row class="mt-2">
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="text-subtitle-1">{{ lan.dash_nextFollowUps }}</v-card-title>
            <v-table density="compact">
              <tbody>
                <tr
                  v-for="f in data.dueFollowUps"
                  :key="`${f.purchaseOrderId}-${f.seq}`"
                  data-test="followup-row"
                >
                  <td>{{ f.poNo }}</td>
                  <td>{{ f.supplierName || '—' }}</td>
                  <td :class="{ 'text-error': f.daysLeft < 0, 'text-warning': f.daysLeft === 0 }">
                    {{ daysLeftLabel(f.daysLeft) }}
                  </td>
                </tr>
                <tr v-if="data.dueFollowUps.length === 0">
                  <td class="text-medium-emphasis">{{ lan.followUpEmpty }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="text-subtitle-1">{{ lan.dash_openPlacements }}</v-card-title>
            <v-table density="compact">
              <tbody>
                <tr v-for="p in data.openPlacements" :key="p.id" data-test="placement-row">
                  <td>{{ p.orderNo }}</td>
                  <td>{{ shortDateTime(p.deadlineAt) }}</td>
                  <td>{{ p.assigneeName || lan.placementUnassigned }}</td>
                </tr>
                <tr v-if="data.openPlacements.length === 0">
                  <td class="text-medium-emphasis">{{ lan.placementEmptyOpen }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
