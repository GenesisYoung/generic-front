<script setup lang="ts">
/**
 * PMC dashboard (route /pmc/dashboard): customer orders waiting for an
 * audit, open and overdue audits, purchase placement deadlines and open
 * purchasing exceptions. Every tile opens the page behind its number.
 */
import { onMounted, ref } from 'vue'
import { fmt, lan } from '@/lang'
import { dashboardApi } from '@/features/dashboard/api'
import DashboardTiles from '@/features/dashboard/DashboardTiles.vue'
import { pmcTiles, shortDateTime, type PmcDashboard, type Tile } from '@/features/dashboard/model'
import { label, statusColor, severityColor } from '@/features/purchase-exception/model'
import type { ExceptionStatus, Severity } from '@/features/purchase-exception/model'

const data = ref<PmcDashboard | null>(null)
const tiles = ref<Tile[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await dashboardApi.pmc()
    tiles.value = pmcTiles(data.value)
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
  <v-container id="pmc-dashboard" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-3">
      <div>
        <h1 class="text-h5">{{ lan.pmcDashboard }}</h1>
        <div v-if="data" class="text-caption text-medium-emphasis" data-test="generated">
          {{ fmt(lan.dash_generatedAt, shortDateTime(data.generatedAt)) }}
          <span v-if="data.customerOrders.lastSyncAt">
            · {{ fmt(lan.dash_lastSync, shortDateTime(data.customerOrders.lastSyncAt)) }}</span
          >
          <span v-if="data.customerOrders.lastSyncStatus === 'FAILED'" class="text-error">
            · {{ lan.customerOrderSyncFailedNote }}</span
          >
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

      <v-row class="mt-2">
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="text-subtitle-1">{{ lan.dash_overduePlacements }}</v-card-title>
            <v-table density="compact">
              <tbody>
                <tr v-for="p in data.overduePlacements" :key="p.id" data-test="overdue-row">
                  <td>{{ p.orderNo }}</td>
                  <td class="text-error">{{ shortDateTime(p.deadlineAt) }}</td>
                  <td>{{ p.assigneeName || lan.placementUnassigned }}</td>
                </tr>
                <tr v-if="data.overduePlacements.length === 0">
                  <td class="text-medium-emphasis">{{ lan.dash_nothingOverdue }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title class="text-subtitle-1">{{ lan.dash_urgentExceptions }}</v-card-title>
            <v-table density="compact">
              <tbody>
                <tr v-for="x in data.urgentExceptions" :key="x.id" data-test="urgent-row">
                  <td>
                    <v-chip size="x-small" :color="severityColor(x.severity as Severity)">
                      {{ label('Severity', x.severity) }}
                    </v-chip>
                  </td>
                  <td>{{ x.poNo }}</td>
                  <td>{{ label('Category', x.category) }}</td>
                  <td>
                    <v-chip size="x-small" :color="statusColor(x.status as ExceptionStatus)">
                      {{ label('Status', x.status) }}
                    </v-chip>
                  </td>
                </tr>
                <tr v-if="data.urgentExceptions.length === 0">
                  <td class="text-medium-emphasis">{{ lan.dash_noUrgent }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
