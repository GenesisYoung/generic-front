<script setup lang="ts">
/**
 * Purchase quotations (route /purchase/quotations).
 *
 * Lists the orders that can be quoted: their purchase plan is made in the old
 * ERP and nothing has been bought for it yet. Each order shows whether it has
 * a product BOM, a packaging BOM, both or none; an order without a BOM cannot
 * be costed. "Quote" opens the quotation plan of the order. Users with
 * menu.quotation.update can change the default fee rates and the profit
 * margin tiers here.
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fmt, lan } from '@/lang'
import { useAuthStore } from '@/stores/auth'
import { quotationApi } from '@/features/quotation/api'
import {
  FEE_BASES,
  baseLabel,
  bomStatusColor,
  bomStatusLabel,
  boughtLabel,
  feeLabel,
  qty,
  validateSettings,
  type BomFilter,
  type OrderSummary,
  type QuotationSettings,
} from '@/features/quotation/model'

const auth = useAuthStore()
const router = useRouter()
const canEdit = computed(() => auth.can('menu.quotation.update'))

const orders = ref<OrderSummary[]>([])
const bom = ref<BomFilter>('ALL')
const keyword = ref('')
const loading = ref(false)
const loaded = ref(false)
const available = ref(true)
const error = ref('')
const notice = ref('')

const counts = computed(() => {
  const withBom = orders.value.filter((o) => o.bomStatus !== 'NONE').length
  return { all: orders.value.length, withBom, without: orders.value.length - withBom }
})
const shown = computed(() =>
  orders.value.filter((o) =>
    bom.value === 'ALL'
      ? true
      : bom.value === 'WITH'
        ? o.bomStatus !== 'NONE'
        : o.bomStatus === 'NONE',
  ),
)

const showSettings = ref(false)
const settings = ref<QuotationSettings | null>(null)
const settingsError = ref('')
const saving = ref(false)

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
}

async function load(refresh = false) {
  loading.value = true
  error.value = ''
  try {
    available.value = (await quotationApi.status()).available
    // The filter is applied here, so switching it needs no new request.
    orders.value = available.value ? await quotationApi.orders('ALL', keyword.value, refresh) : []
  } catch (e) {
    error.value = fmt(lan.quotationLoadFailed, message(e))
  } finally {
    loading.value = false
    loaded.value = true
  }
}

function open(o: OrderSummary) {
  void router.push({ path: '/purchase/quotations/plan', query: { orderNo: o.orderNo } })
}

async function openSettings() {
  settingsError.value = ''
  showSettings.value = true
  try {
    settings.value = await quotationApi.settings()
  } catch (e) {
    settingsError.value = message(e)
  }
}

function addTier() {
  settings.value?.marginTiers.push({ minAmount: 0, ratePercent: 0 })
}

function removeTier(i: number) {
  settings.value?.marginTiers.splice(i, 1)
}

async function saveSettings() {
  if (!settings.value) return
  settingsError.value = validateSettings(settings.value)
  if (settingsError.value) return
  saving.value = true
  try {
    settings.value = await quotationApi.saveSettings(settings.value)
    notice.value = lan.quotationSettingsSaved ?? ''
    showSettings.value = false
  } catch (e) {
    settingsError.value = message(e)
  } finally {
    saving.value = false
  }
}

const baseChoices = FEE_BASES.map((b) => ({ title: baseLabel(b), value: b }))

onMounted(() => load())
</script>

<template>
  <v-container id="quotations" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <div class="flex-grow-1">
        <h1 class="text-h5">{{ lan.quotations }}</h1>
        <div class="text-body-2 text-medium-emphasis">{{ lan.quotationHint }}</div>
      </div>
      <v-btn variant="outlined" data-test="settings" @click="openSettings">
        {{ lan.quotationRates }}
      </v-btn>
      <v-btn variant="outlined" :loading="loading" data-test="refresh" @click="load(true)">
        {{ lan.refresh }}
      </v-btn>
    </div>

    <v-alert
      v-if="loaded && !available"
      type="warning"
      variant="tonal"
      class="mb-2"
      data-test="off"
    >
      {{ lan.quotationLegacyOff }}
    </v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-2" data-test="error">
      {{ error }}
    </v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" class="mb-2" closable data-test="notice">
      {{ notice }}
    </v-alert>

    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-btn-toggle
        v-model="bom"
        mandatory
        density="comfortable"
        variant="outlined"
        data-test="bom-filter"
      >
        <v-btn value="ALL" data-test="filter-all">{{
          fmt(lan.quotationFilterAll, counts.all)
        }}</v-btn>
        <v-btn value="WITH" data-test="filter-with">
          {{ fmt(lan.quotationFilterWith, counts.withBom) }}
        </v-btn>
        <v-btn value="WITHOUT" data-test="filter-without">
          {{ fmt(lan.quotationFilterWithout, counts.without) }}
        </v-btn>
      </v-btn-toggle>
      <v-text-field
        v-model="keyword"
        :label="lan.quotationSearch"
        density="compact"
        hide-details
        clearable
        prepend-inner-icon="mdi-magnify"
        style="max-width: 320px"
        data-test="keyword"
        @keyup.enter="load()"
        @click:clear="((keyword = ''), load())"
      />
    </div>

    <v-table density="comfortable">
      <thead>
        <tr>
          <th>{{ lan.quotationColOrder }}</th>
          <th>{{ lan.quotationColCustomer }}</th>
          <th>{{ lan.quotationColPlan }}</th>
          <th>{{ lan.quotationColDelivery }}</th>
          <th class="text-end">{{ lan.quotationColLines }}</th>
          <th class="text-end">{{ lan.quotationColQty }}</th>
          <th>{{ lan.quotationColBom }}</th>
          <th>{{ lan.quotationColBought }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in shown" :key="o.orderNo" data-test="order-row">
          <td class="font-weight-medium">{{ o.orderNo }}</td>
          <td>{{ [o.customerCode, o.customerName].filter(Boolean).join(' ') || '—' }}</td>
          <td>
            {{ o.planNo || '—' }}
            <div class="text-caption text-medium-emphasis">{{ o.planDate || '' }}</div>
          </td>
          <td>{{ o.deliveryDate || '—' }}</td>
          <td class="text-end">{{ o.lineCount }}</td>
          <td class="text-end">{{ qty(o.totalQty) }}</td>
          <td>
            <v-chip
              size="small"
              variant="tonal"
              :color="bomStatusColor(o.bomStatus)"
              data-test="bom-status"
            >
              {{ bomStatusLabel(o.bomStatus) }}
            </v-chip>
          </td>
          <td data-test="bought">
            <v-chip
              size="small"
              variant="tonal"
              :color="o.planLinesBought ? 'warning' : 'success'"
            >
              {{ boughtLabel(o) }}
            </v-chip>
          </td>
          <td class="text-end">
            <v-btn
              size="small"
              color="primary"
              variant="tonal"
              :disabled="o.bomStatus === 'NONE'"
              data-test="quote"
              @click="open(o)"
            >
              {{ lan.quotationQuote }}
            </v-btn>
          </td>
        </tr>
        <tr v-if="loaded && !loading && shown.length === 0">
          <td colspan="9" class="text-center text-medium-emphasis py-6" data-test="empty">
            {{ lan.quotationEmpty }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="showSettings" max-width="720" scrollable>
      <v-card data-test="settings-dialog">
        <v-card-title>{{ lan.quotationRates }}</v-card-title>
        <v-card-text v-if="settings">
          <div class="text-caption text-medium-emphasis mb-2">{{ lan.quotationRatesHint }}</div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>{{ lan.quotationColFee }}</th>
                <th style="min-width: 180px">{{ lan.quotationColBase }}</th>
                <th style="width: 130px">{{ lan.quotationColRate }}</th>
                <th>{{ lan.quotationColEnabled }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in settings.fees" :key="f.code" data-test="fee-row">
                <td>{{ feeLabel(f.code) }}</td>
                <td>
                  <v-select
                    v-model="f.base"
                    :items="baseChoices"
                    :disabled="!canEdit"
                    density="compact"
                    hide-details
                  />
                </td>
                <td>
                  <v-text-field
                    v-model.number="f.ratePercent"
                    type="number"
                    suffix="%"
                    :disabled="!canEdit"
                    density="compact"
                    hide-details
                    :data-test="`fee-${f.code}`"
                  />
                </td>
                <td>
                  <v-checkbox-btn v-model="f.enabled" :disabled="!canEdit" />
                </td>
              </tr>
            </tbody>
          </v-table>

          <div class="text-subtitle-2 mt-4">{{ lan.quotationTiers }}</div>
          <div class="text-caption text-medium-emphasis mb-2">{{ lan.quotationTiersHint }}</div>
          <div
            v-for="(t, i) in settings.marginTiers"
            :key="i"
            class="d-flex align-center ga-2 mb-2"
            data-test="tier-row"
          >
            <v-text-field
              v-model.number="t.minAmount"
              type="number"
              :label="lan.quotationTierMinLabel"
              :disabled="!canEdit"
              density="compact"
              hide-details
            />
            <v-text-field
              v-model.number="t.ratePercent"
              type="number"
              suffix="%"
              :label="lan.quotationTierRate"
              :disabled="!canEdit"
              density="compact"
              hide-details
            />
            <v-btn
              v-if="canEdit"
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              :aria-label="lan.fuTplRemove"
              @click="removeTier(i)"
            />
          </div>
          <v-btn
            v-if="canEdit"
            variant="text"
            prepend-icon="mdi-plus"
            data-test="add-tier"
            @click="addTier"
          >
            {{ lan.quotationAddTier }}
          </v-btn>
          <v-alert
            v-if="settingsError"
            type="error"
            variant="tonal"
            class="mt-2"
            data-test="settings-error"
          >
            {{ settingsError }}
          </v-alert>
        </v-card-text>
        <v-card-text v-else-if="settingsError">
          <v-alert type="error" variant="tonal">{{ settingsError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showSettings = false">{{ lan.cancel }}</v-btn>
          <v-btn
            v-if="canEdit"
            color="primary"
            :loading="saving"
            :disabled="!settings"
            data-test="save-settings"
            @click="saveSettings"
          >
            {{ lan.save }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
