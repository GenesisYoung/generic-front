<script setup lang="ts">
/**
 * Follow-up templates (route /purchase/followup-templates). A template sets the
 * production period, the notification days inside it and how often to remind
 * after it. Each notification day becomes its own follow-up task. New purchase
 * orders get the default template; the follow-up to-do list can switch one
 * order to another template. Changing templates needs
 * menu.followupTemplate.update; everyone else sees the list read-only.
 */
import { computed, onMounted, ref } from 'vue'
import { fmt, lan } from '@/lang'
import { useAuthStore } from '@/stores/auth'
import { templateApi } from '@/features/followup-template/api'
import {
  DAYS_MAX,
  NAME_MAX,
  NOTE_MAX,
  OVERDUE_MAX,
  PRODUCTION_MAX,
  addDays,
  daysLabel,
  emptyTemplateForm,
  everyNDays,
  formFrom,
  overdueLabel,
  previewTasks,
  toggleDay,
  validateTemplate,
  type FollowUpTemplate,
  type TemplateForm,
} from '@/features/followup-template/model'

const auth = useAuthStore()
const canEdit = computed(() => auth.can('menu.followupTemplate.update'))

const rows = ref<FollowUpTemplate[]>([])
const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const notice = ref('')

/** The template being edited; null with showEditor = a new one. */
const editing = ref<FollowUpTemplate | null>(null)
const showEditor = ref(false)
const form = ref<TemplateForm>(emptyTemplateForm())
const every = ref<number | null>(7)
const saving = ref(false)
const dialogError = ref('')

const removing = ref<FollowUpTemplate | null>(null)
const showRemove = computed({
  get: () => removing.value !== null,
  set: (v: boolean) => {
    if (!v) removing.value = null
  },
})
const busyId = ref<number | null>(null)

/** Day buttons 1..production period (capped so a typo cannot draw thousands). */
const dayChoices = computed(() => {
  const p = Number(form.value.productionDays)
  const n = Number.isInteger(p) && p > 0 ? Math.min(p, PRODUCTION_MAX) : 0
  return Array.from({ length: n }, (_, i) => i + 1)
})
const preview = computed(() =>
  previewTasks(form.value.notifyDays, Number(form.value.productionDays) || null),
)
const today = new Date()

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = await templateApi.list()
  } catch (e) {
    error.value = fmt(lan.fuTplLoadFailed, message(e))
  } finally {
    loading.value = false
    loaded.value = true
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyTemplateForm()
  dialogError.value = ''
  showEditor.value = true
}

function openEdit(t: FollowUpTemplate) {
  editing.value = t
  form.value = formFrom(t)
  dialogError.value = ''
  showEditor.value = true
}

function toggle(day: number) {
  form.value.notifyDays = toggleDay(form.value.notifyDays, day)
}

function fill() {
  form.value.notifyDays = everyNDays(Number(form.value.productionDays), Number(every.value))
}

async function save() {
  form.value.productionDays = Number(form.value.productionDays)
  form.value.overduePeriodDays = Number(form.value.overduePeriodDays ?? 1)
  dialogError.value = validateTemplate(form.value)
  if (dialogError.value) return
  saving.value = true
  try {
    const saved = editing.value
      ? await templateApi.update(editing.value.id, form.value)
      : await templateApi.create(form.value)
    notice.value = fmt(lan.fuTplSaved, saved.name)
    showEditor.value = false
    await load()
  } catch (e) {
    dialogError.value = message(e)
  } finally {
    saving.value = false
  }
}

async function makeDefault(t: FollowUpTemplate) {
  busyId.value = t.id
  error.value = ''
  try {
    rows.value = await templateApi.makeDefault(t.id)
    notice.value = fmt(lan.fuTplDefaultSet, t.name)
  } catch (e) {
    error.value = message(e)
  } finally {
    busyId.value = null
  }
}

async function confirmRemove() {
  const t = removing.value
  if (!t) return
  busyId.value = t.id
  error.value = ''
  try {
    rows.value = await templateApi.remove(t.id)
    notice.value = fmt(lan.fuTplRemoved, t.name)
  } catch (e) {
    error.value = message(e)
  } finally {
    busyId.value = null
    removing.value = null
  }
}

onMounted(load)
</script>

<template>
  <v-container id="followup-templates" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <div class="flex-grow-1">
        <h1 class="text-h5">{{ lan.followUpTemplates }}</h1>
        <div class="text-body-2 text-medium-emphasis">{{ lan.fuTplHint }}</div>
      </div>
      <v-btn variant="text" to="/purchase/followup-plan-groups" data-test="to-plan-groups">
        {{ lan.followUpToPlanGroups }}
      </v-btn>
      <v-btn variant="outlined" :loading="loading" data-test="refresh" @click="load">
        {{ lan.refresh }}
      </v-btn>
      <v-btn v-if="canEdit" color="primary" data-test="new" @click="openCreate">
        {{ lan.fuTplNew }}
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-2" data-test="error">
      {{ error }}
    </v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" class="mb-2" closable data-test="notice">
      {{ notice }}
    </v-alert>

    <v-table density="comfortable">
      <thead>
        <tr>
          <th>{{ lan.fuTplColName }}</th>
          <th>{{ lan.fuTplColMaterial }}</th>
          <th>{{ lan.fuTplColProduction }}</th>
          <th>{{ lan.fuTplColDays }}</th>
          <th>{{ lan.fuTplColOverdue }}</th>
          <th class="text-end">{{ lan.fuTplColOrders }}</th>
          <th v-if="canEdit"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in rows" :key="t.id" data-test="row">
          <td>
            {{ t.name }}
            <v-chip
              v-if="t.isDefault"
              size="small"
              color="primary"
              class="ml-1"
              data-test="default"
            >
              {{ lan.fuTplDefault }}
            </v-chip>
          </td>
          <td>{{ t.materialNote || '—' }}</td>
          <td>{{ t.productionDays ? fmt(lan.fuTplDaysCount, t.productionDays) : '—' }}</td>
          <td data-test="days">{{ daysLabel(t) }}</td>
          <td>{{ overdueLabel(t.overduePeriodDays) }}</td>
          <td class="text-end">{{ t.activeOrders }}</td>
          <td v-if="canEdit" class="text-end text-no-wrap">
            <v-btn size="small" variant="text" data-test="edit" @click="openEdit(t)">
              {{ lan.fuTplEdit }}
            </v-btn>
            <v-btn
              v-if="!t.isDefault"
              size="small"
              variant="text"
              :loading="busyId === t.id"
              data-test="make-default"
              @click="makeDefault(t)"
            >
              {{ lan.fuTplMakeDefault }}
            </v-btn>
            <v-btn
              v-if="!t.isDefault"
              size="small"
              variant="text"
              color="error"
              data-test="remove"
              @click="removing = t"
            >
              {{ lan.fuTplRemove }}
            </v-btn>
          </td>
        </tr>
        <tr v-if="loaded && !loading && rows.length === 0">
          <td
            :colspan="canEdit ? 7 : 6"
            class="text-center text-medium-emphasis py-6"
            data-test="empty"
          >
            {{ lan.fuTplEmpty }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="showEditor" max-width="760" scrollable>
      <v-card data-test="editor">
        <v-card-title class="text-wrap">
          {{ editing ? fmt(lan.fuTplEditTitle, editing.name) : lan.fuTplCreateTitle }}
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="editing && !editing.dayBased"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            {{ lan.fuTplStageNote }}
          </v-alert>
          <v-text-field
            v-model="form.name"
            :label="lan.fuTplName"
            :counter="NAME_MAX"
            data-test="name"
          />
          <v-text-field
            v-model="form.materialNote"
            :label="lan.fuTplMaterialNote"
            :counter="NOTE_MAX"
            data-test="material"
          />
          <div class="d-flex flex-wrap ga-3">
            <v-text-field
              v-model.number="form.productionDays"
              type="number"
              min="1"
              :max="PRODUCTION_MAX"
              :label="lan.fuTplProductionLabel"
              style="min-width: 240px"
              data-test="production"
            />
            <v-text-field
              v-model.number="form.overduePeriodDays"
              type="number"
              min="0"
              :max="OVERDUE_MAX"
              :label="lan.fuTplOverdueLabel"
              style="min-width: 240px"
              data-test="overdue"
            />
          </div>

          <div class="text-subtitle-2">{{ lan.fuTplNotifyDays }}</div>
          <div class="text-caption text-medium-emphasis mb-2">{{ lan.fuTplNotifyHint }}</div>
          <div class="d-flex align-center flex-wrap ga-2 mb-2">
            <v-text-field
              v-model.number="every"
              type="number"
              min="1"
              density="compact"
              hide-details
              :label="lan.fuTplEveryN"
              style="max-width: 140px"
              data-test="every"
            />
            <v-btn size="small" variant="tonal" data-test="fill" @click="fill">
              {{ lan.fuTplFill }}
            </v-btn>
            <v-btn size="small" variant="text" data-test="clear" @click="form.notifyDays = []">
              {{ lan.fuTplClear }}
            </v-btn>
            <span class="text-caption" data-test="chosen">
              {{ fmt(lan.fuTplChosen, form.notifyDays.length) }} / {{ DAYS_MAX }}
            </span>
          </div>
          <div class="d-flex flex-wrap ga-1 mb-4">
            <v-btn
              v-for="d in dayChoices"
              :key="d"
              size="x-small"
              min-width="36"
              :variant="form.notifyDays.includes(d) ? 'flat' : 'outlined'"
              :color="form.notifyDays.includes(d) ? 'primary' : undefined"
              :data-test="`day-${d}`"
              @click="toggle(d)"
            >
              {{ d }}
            </v-btn>
          </div>

          <div class="text-subtitle-2 mb-1">{{ lan.fuTplPreview }}</div>
          <div v-if="preview.length === 0" class="text-body-2 text-medium-emphasis">
            {{ lan.fuTplPreviewEmpty }}
          </div>
          <div
            v-for="p in preview"
            :key="p.seq"
            class="text-body-2 text-medium-emphasis"
            data-test="preview"
          >
            {{
              fmt(
                lan.fuTplPreviewRow,
                p.seq,
                p.fromDay,
                p.toDay,
                addDays(today, p.fromDay),
                addDays(today, p.toDay),
              )
            }}
          </div>

          <v-alert
            v-if="dialogError"
            type="error"
            variant="tonal"
            class="mt-3"
            data-test="dialog-error"
          >
            {{ dialogError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="saving" @click="showEditor = false">{{ lan.cancel }}</v-btn>
          <v-btn color="primary" :loading="saving" data-test="save" @click="save">
            {{ lan.save }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showRemove" max-width="440">
      <v-card v-if="removing" data-test="remove-dialog">
        <v-card-title class="text-wrap">{{
          fmt(lan.fuTplRemoveTitle, removing.name)
        }}</v-card-title>
        <v-card-text>{{ fmt(lan.fuTplRemoveHint, removing.activeOrders) }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="removing = null">{{ lan.cancel }}</v-btn>
          <v-btn
            color="error"
            :loading="busyId === removing.id"
            data-test="confirm-remove"
            @click="confirmRemove"
          >
            {{ lan.fuTplRemove }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
