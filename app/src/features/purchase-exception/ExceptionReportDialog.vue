<script setup lang="ts">
/**
 * Dialog to report a purchasing exception. Used on the 采购异常 page (the
 * user types the PO number) and on the follow-up to-do list (the order is
 * already known). Emits `reported` with the saved exception.
 */
import { ref, watch } from 'vue'
import { lan } from '@/lang'
import { exceptionApi } from './api'
import {
  CATEGORIES,
  SEVERITIES,
  TEXT_MAX,
  emptyReportForm,
  label,
  reportFormError,
  type PurchaseException,
  type ReportForm,
} from './model'

const props = defineProps<{
  modelValue: boolean
  /** Known order (follow-up list); when null the user types the PO number. */
  purchaseOrderId?: number | null
  poNo?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  reported: [value: PurchaseException]
}>()

const form = ref<ReportForm>(emptyReportForm())
const error = ref('')
const saving = ref(false)

const categoryItems = CATEGORIES.map((value) => ({ value, title: label('Category', value) }))
const severityItems = SEVERITIES.map((value) => ({ value, title: label('Severity', value) }))

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      form.value = emptyReportForm(props.purchaseOrderId ?? null, props.poNo ?? '')
      error.value = ''
    }
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
}

async function save() {
  const problem = reportFormError(form.value)
  if (problem) {
    error.value = lan[problem] ?? problem
    return
  }
  saving.value = true
  error.value = ''
  try {
    const saved = await exceptionApi.report(form.value)
    emit('reported', saved)
    close()
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="560"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>{{ lan.exceptionReportTitle }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ lan.exceptionReportHint }}</p>
        <v-text-field
          v-model="form.poNo"
          :label="lan.exceptionPoNo"
          :readonly="form.purchaseOrderId != null"
          data-test="report-po"
        />
        <v-select
          v-model="form.category"
          :items="categoryItems"
          :label="lan.exceptionCategory"
          data-test="report-category"
        />
        <v-btn-toggle
          v-model="form.severity"
          mandatory
          density="comfortable"
          variant="outlined"
          class="mb-4"
        >
          <v-btn v-for="s in severityItems" :key="s.value" :value="s.value">{{ s.title }}</v-btn>
        </v-btn-toggle>
        <v-textarea
          v-model="form.description"
          :label="lan.exceptionDescription"
          :counter="TEXT_MAX"
          rows="3"
          data-test="report-description"
        />
        <v-text-field
          v-model="form.impactDate"
          type="date"
          :label="lan.exceptionImpactDate"
          data-test="report-date"
        />
        <v-alert v-if="error" type="error" variant="tonal" data-test="report-error">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" @click="close">{{ lan.cancel }}</v-btn>
        <v-btn color="error" :loading="saving" data-test="report-save" @click="save">
          {{ lan.exceptionReport }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
