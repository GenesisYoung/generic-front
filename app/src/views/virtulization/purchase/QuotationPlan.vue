<script setup lang="ts">
/**
 * Quotation plan of one order (route /purchase/quotations/plan?orderNo=...).
 *
 * The backend prices every bought part of the order's product BOM and
 * packaging BOM with the cheapest valid purchase strategy (采购策略) price,
 * keeps product and packaging material costs apart, adds the fees and the
 * profit margin tier, and returns the totals. Here the purchaser can choose
 * another supplier for a material, change a fee rate or set the margin by
 * hand for this quotation only; every change is recalculated by the backend.
 * "Export Excel" downloads exactly what is on screen.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fmt, lan } from '@/lang'
import { quotationApi } from '@/features/quotation/api'
import {
  baseLabel,
  bomStatusColor,
  bomStatusLabel,
  checkColor,
  checkLabel,
  emptyRequest,
  feeLabel,
  money,
  percent,
  price,
  qty,
  validRate,
  type CalculateRequest,
  type QuotationItem,
  type QuotationPlan,
} from '@/features/quotation/model'

const route = useRoute()
const orderNo = computed(() => String(route.query.orderNo ?? ''))

const plan = ref<QuotationPlan | null>(null)
const request = ref<CalculateRequest>(emptyRequest())
const loading = ref(false)
const exporting = ref(false)
const error = ref('')
const notice = ref('')

/** Rate fields for this quotation (percent), keyed by fee code. */
const feeRates = ref<Record<string, number>>({})
const manualMargin = ref(false)
const marginRate = ref<number | null>(null)

const sections = computed(() =>
  plan.value
    ? [
        {
          key: 'product',
          title: lan.quotationProductMaterials,
          items: plan.value.productItems,
          subtotal: plan.value.productMaterialCost,
          subtotalLabel: lan.quotationProductSubtotal,
        },
        {
          key: 'packaging',
          title: lan.quotationPackagingMaterials,
          items: plan.value.packagingItems,
          subtotal: plan.value.packagingMaterialCost,
          subtotalLabel: lan.quotationPackagingSubtotal,
        },
      ]
    : [],
)
const feesBeforeProfit = computed(() => plan.value?.fees.filter((f) => f.base !== 'PRICE') ?? [])
const feesAfterProfit = computed(() => plan.value?.fees.filter((f) => f.base === 'PRICE') ?? [])

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
}

function supplierChoices(i: QuotationItem) {
  return i.suppliers.map((s) => ({
    title: `${s.supplierName || s.supplierCode} · ${price(s.price)}${s.currency ? ' ' + s.currency : ''}`,
    value: s.supplierCode,
  }))
}

async function calculate() {
  if (!orderNo.value) {
    error.value = lan.quotationNoOrder ?? ''
    return
  }
  loading.value = true
  error.value = ''
  try {
    const p = await quotationApi.plan(orderNo.value, request.value)
    plan.value = p
    feeRates.value = Object.fromEntries(p.fees.map((f) => [f.code, f.ratePercent]))
    if (!manualMargin.value) marginRate.value = p.marginRate
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}

function choose(i: QuotationItem, supplierCode: string) {
  request.value = {
    ...request.value,
    selections: { ...request.value.selections, [i.materialCode]: supplierCode },
  }
  void calculate()
}

function applyRates() {
  const p = plan.value
  if (!p) return
  for (const f of p.fees) {
    if (!validRate(feeRates.value[f.code])) {
      error.value = lan.quotationRateRange ?? ''
      return
    }
  }
  if (manualMargin.value && !validRate(marginRate.value)) {
    error.value = lan.quotationRateRange ?? ''
    return
  }
  request.value = {
    ...request.value,
    fees: p.fees.map((f) => ({
      code: f.code,
      base: f.base,
      ratePercent: Number(feeRates.value[f.code]),
      enabled: true,
    })),
    marginRate: manualMargin.value ? Number(marginRate.value) : null,
  }
  void calculate()
}

function reset() {
  request.value = emptyRequest()
  manualMargin.value = false
  void calculate()
}

async function exportExcel() {
  exporting.value = true
  error.value = ''
  try {
    notice.value = fmt(
      lan.quotationExported,
      await quotationApi.exportExcel(orderNo.value, request.value),
    )
  } catch (e) {
    error.value = message(e)
  } finally {
    exporting.value = false
  }
}

onMounted(calculate)
</script>

<template>
  <v-container id="quotation-plan" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-btn
        variant="text"
        prepend-icon="mdi-arrow-left"
        to="/purchase/quotations"
        data-test="back"
      >
        {{ lan.quotations }}
      </v-btn>
      <div class="flex-grow-1">
        <h1 class="text-h5">{{ fmt(lan.quotationPlanTitle, orderNo) }}</h1>
        <div v-if="plan" class="text-body-2 text-medium-emphasis">
          {{ [plan.order.customerCode, plan.order.customerName].filter(Boolean).join(' ') }}
          <span v-if="plan.order.planNo"> · {{ fmt(lan.quotationPlanNo, plan.order.planNo) }}</span>
          <span v-if="plan.order.deliveryDate">
            · {{ fmt(lan.quotationDelivery, plan.order.deliveryDate) }}
          </span>
        </div>
      </div>
      <v-chip
        v-if="plan"
        variant="tonal"
        :color="bomStatusColor(plan.order.bomStatus)"
        data-test="bom-status"
      >
        {{ bomStatusLabel(plan.order.bomStatus) }}
      </v-chip>
      <v-btn variant="outlined" :loading="loading" data-test="reset" @click="reset">
        {{ lan.quotationReset }}
      </v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-microsoft-excel"
        :loading="exporting"
        :disabled="!plan"
        data-test="export"
        @click="exportExcel"
      >
        {{ lan.quotationExport }}
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2" data-test="error">
      {{ error }}
    </v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" class="mb-2" closable data-test="notice">
      {{ notice }}
    </v-alert>
    <v-alert
      v-if="plan && plan.warnings.length"
      type="warning"
      variant="tonal"
      class="mb-2"
      data-test="warnings"
    >
      <div v-for="w in plan.warnings" :key="w">{{ w }}</div>
    </v-alert>
    <v-progress-linear v-if="loading" indeterminate class="mb-2" />

    <template v-if="plan">
      <div class="text-subtitle-1 mb-1">{{ lan.quotationOrderLines }}</div>
      <v-table density="compact" class="mb-4">
        <thead>
          <tr>
            <th>{{ lan.quotationColProduct }}</th>
            <th>{{ lan.quotationColSpec }}</th>
            <th class="text-end">{{ lan.quotationColQty }}</th>
            <th>{{ lan.quotationColProductBom }}</th>
            <th>{{ lan.quotationColPackagingBom }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(l, i) in plan.lines" :key="l.lineId ?? i" data-test="line-row">
            <td>
              {{ l.productCode }}
              <div class="text-caption text-medium-emphasis">{{ l.productName }}</div>
            </td>
            <td class="text-caption">{{ l.spec || '—' }}</td>
            <td class="text-end">{{ qty(l.qty) }} {{ l.unit || '' }}</td>
            <td>{{ l.productBomCode || '—' }}</td>
            <td>{{ l.packagingBomCode || '—' }}</td>
          </tr>
        </tbody>
      </v-table>

      <template v-for="s in sections" :key="s.key">
        <div class="text-subtitle-1 mb-1">{{ s.title }}</div>
        <v-table density="compact" class="mb-1" :data-test="`items-${s.key}`">
          <thead>
            <tr>
              <th>{{ lan.quotationColMaterial }}</th>
              <th class="text-end">{{ lan.quotationColQtyPerUnit }}</th>
              <th class="text-end">{{ lan.quotationColTotalQty }}</th>
              <th style="min-width: 240px">{{ lan.quotationColSupplier }}</th>
              <th class="text-end">{{ lan.quotationColUnitPrice }}</th>
              <th class="text-end">{{ lan.quotationColAmount }}</th>
              <th class="text-end">{{ lan.quotationColBasePrice }}</th>
              <th>{{ lan.quotationColCheck }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(i, n) in s.items"
              :key="`${i.bomCode}-${i.lineNo}-${i.materialCode}-${n}`"
              data-test="item-row"
            >
              <td>
                {{ i.materialCode }} {{ i.materialName || '' }}
                <div class="text-caption text-medium-emphasis">{{ i.spec || '' }}</div>
              </td>
              <td class="text-end">{{ qty(i.qtyPerUnit) }} {{ i.unit || '' }}</td>
              <td class="text-end">{{ qty(i.totalQty) }}</td>
              <td>
                <v-select
                  v-if="i.suppliers.length > 1"
                  :model-value="i.selectedSupplierCode"
                  :items="supplierChoices(i)"
                  density="compact"
                  hide-details
                  :data-test="`supplier-${i.materialCode}`"
                  @update:model-value="(v: string) => choose(i, v)"
                />
                <span v-else-if="i.suppliers.length === 1">
                  {{ i.selectedSupplierName || i.selectedSupplierCode }}
                </span>
                <span v-else class="text-error">{{ lan.quotationNoSupplier }}</span>
                <div v-if="i.suppliers.length > 1" class="text-caption text-medium-emphasis">
                  {{ fmt(lan.quotationSupplierCount, i.suppliers.length, price(i.cheapestPrice)) }}
                </div>
              </td>
              <td class="text-end">{{ price(i.unitPrice) }}</td>
              <td class="text-end">{{ money(i.amount) }}</td>
              <td class="text-end">{{ price(i.basePrice) }}</td>
              <td>
                <v-chip size="x-small" variant="tonal" :color="checkColor(i.priceCheck)">
                  {{ checkLabel(i.priceCheck) }}
                </v-chip>
              </td>
            </tr>
            <tr v-if="s.items.length === 0">
              <td colspan="8" class="text-center text-medium-emphasis py-3">
                {{ lan.quotationNoItems }}
              </td>
            </tr>
            <tr>
              <td colspan="5" class="text-end font-weight-medium">{{ s.subtotalLabel }}</td>
              <td class="text-end font-weight-medium" :data-test="`subtotal-${s.key}`">
                {{ money(s.subtotal) }}
              </td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </v-table>
        <div class="mb-4"></div>
      </template>

      <v-card variant="outlined" max-width="760" data-test="summary">
        <v-card-title>{{ lan.quotationCalculation }}</v-card-title>
        <v-card-text>
          <v-table density="compact">
            <thead>
              <tr>
                <th>{{ lan.quotationColItem }}</th>
                <th>{{ lan.quotationColBase }}</th>
                <th style="width: 140px">{{ lan.quotationColRate }}</th>
                <th class="text-end">{{ lan.quotationColAmount }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{{ lan.quotationProductSubtotal }}</td>
                <td></td>
                <td></td>
                <td class="text-end">{{ money(plan.productMaterialCost) }}</td>
              </tr>
              <tr>
                <td>{{ lan.quotationPackagingSubtotal }}</td>
                <td></td>
                <td></td>
                <td class="text-end">{{ money(plan.packagingMaterialCost) }}</td>
              </tr>
              <tr class="font-weight-medium">
                <td>{{ lan.quotationMaterialCost }}</td>
                <td></td>
                <td></td>
                <td class="text-end" data-test="material-cost">{{ money(plan.materialCost) }}</td>
              </tr>
              <tr v-for="f in feesBeforeProfit" :key="f.code" data-test="fee-row">
                <td>{{ feeLabel(f.code) }}</td>
                <td class="text-caption">{{ baseLabel(f.base) }} {{ money(f.baseAmount) }}</td>
                <td>
                  <v-text-field
                    v-model.number="feeRates[f.code]"
                    type="number"
                    suffix="%"
                    density="compact"
                    hide-details
                    :data-test="`rate-${f.code}`"
                  />
                </td>
                <td class="text-end">{{ money(f.amount) }}</td>
              </tr>
              <tr class="font-weight-medium">
                <td>{{ lan.quotationCostBeforeProfit }}</td>
                <td></td>
                <td></td>
                <td class="text-end">{{ money(plan.costBeforeProfit) }}</td>
              </tr>
              <tr data-test="profit-row">
                <td>
                  {{ lan.quotationProfit }}
                  <div class="text-caption text-medium-emphasis">
                    {{
                      plan.marginOverridden
                        ? lan.quotationMarginManual
                        : fmt(lan.quotationMarginTier, money(plan.marginTierMin))
                    }}
                  </div>
                </td>
                <td>
                  <v-checkbox-btn
                    v-model="manualMargin"
                    :label="lan.quotationMarginByHand"
                    density="compact"
                    data-test="manual-margin"
                  />
                </td>
                <td>
                  <v-text-field
                    v-if="manualMargin"
                    v-model.number="marginRate"
                    type="number"
                    suffix="%"
                    density="compact"
                    hide-details
                    data-test="margin-rate"
                  />
                  <span v-else>{{ percent(plan.marginRate) }}</span>
                </td>
                <td class="text-end">{{ money(plan.profit) }}</td>
              </tr>
              <tr v-for="f in feesAfterProfit" :key="f.code" data-test="fee-row">
                <td>{{ feeLabel(f.code) }}</td>
                <td class="text-caption">{{ baseLabel(f.base) }} {{ money(f.baseAmount) }}</td>
                <td>
                  <v-text-field
                    v-model.number="feeRates[f.code]"
                    type="number"
                    suffix="%"
                    density="compact"
                    hide-details
                    :data-test="`rate-${f.code}`"
                  />
                </td>
                <td class="text-end">{{ money(f.amount) }}</td>
              </tr>
              <tr class="text-h6">
                <td>{{ lan.quotationTotal }}</td>
                <td></td>
                <td>{{ plan.currency || '' }}</td>
                <td class="text-end" data-test="total">{{ money(plan.totalPrice) }}</td>
              </tr>
              <tr v-if="plan.unitPrice != null">
                <td>{{ lan.quotationUnitPrice }}</td>
                <td></td>
                <td></td>
                <td class="text-end">{{ price(plan.unitPrice) }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <div class="text-caption text-medium-emphasis px-2">{{ lan.quotationRatesOnlyHere }}</div>
          <v-spacer />
          <v-btn variant="tonal" :loading="loading" data-test="apply-rates" @click="applyRates">
            {{ lan.quotationRecalculate }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </template>
  </v-container>
</template>
