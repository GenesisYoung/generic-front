<script setup lang="ts">
/**
 * Follow-up plan groups (route /purchase/followup-plan-groups).
 *
 * Every purchase order line has a plan type, read from the old ERP. Here the
 * plan types are put into groups: types in one group count as the same plan.
 * A group marked "own task" is followed up as its own task series in every
 * order that has open lines of it, with its own template; all other lines
 * stay in the order's main follow-up task. Changes reach new and changed
 * orders on the next sync; "Apply to open orders" re-splits every open order
 * now. Changing groups needs menu.followupTemplate.update.
 */
import { computed, onMounted, ref } from 'vue'
import { fmt, lan } from '@/lang'
import { useAuthStore } from '@/stores/auth'
import { planGroupApi } from '@/features/followup-plan-group/api'
import { templateApi } from '@/features/followup-template/api'
import type { FollowUpTemplate } from '@/features/followup-template/model'
import {
  CODE_MAX,
  NAME_MAX,
  NOTE_MAX,
  emptyGroupForm,
  groupFormFrom,
  groupNameOf,
  modeLabel,
  refreshMessage,
  typeLabel,
  validateGroup,
  type GroupForm,
  type PlanGroup,
  type PlanGroupOverview,
  type PlanType,
} from '@/features/followup-plan-group/model'

const auth = useAuthStore()
const canEdit = computed(() => auth.can('menu.followupTemplate.update'))

const data = ref<PlanGroupOverview>({ groups: [], types: [], linesSynced: true })
const templates = ref<FollowUpTemplate[]>([])
const loading = ref(false)
const loaded = ref(false)
const error = ref('')
const notice = ref('')

const editing = ref<PlanGroup | null>(null)
const showEditor = ref(false)
const form = ref<GroupForm>(emptyGroupForm())
const saving = ref(false)
const dialogError = ref('')

const removing = ref<PlanGroup | null>(null)
const showRemove = computed({
  get: () => removing.value !== null,
  set: (v: boolean) => {
    if (!v) removing.value = null
  },
})
const busy = ref(false)
const applying = ref(false)
const busyTypeId = ref<number | null>(null)

const newCode = ref('')
const newName = ref('')
const newGroupId = ref<number | null>(null)

const typeChoices = computed(() =>
  data.value.types.map((t) => ({ title: typeLabel(t), value: t.code })),
)
const groupChoices = computed(() => [
  { title: lan.planGroupNone ?? '', value: null as number | null },
  ...data.value.groups.map((g) => ({ title: g.name, value: g.id as number | null })),
])
const templateChoices = computed(() => [
  { title: lan.planGroupDefaultTemplate ?? '', value: null as number | null },
  ...templates.value.map((t) => ({ title: t.name, value: t.id as number | null })),
])
const ungrouped = computed(() => data.value.types.filter((t) => t.groupId == null).length)

function message(e: unknown): string {
  return e instanceof Error && e.message ? e.message : (lan.requestFailed ?? '')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await planGroupApi.overview()
  } catch (e) {
    error.value = fmt(lan.planGroupLoadFailed, message(e))
  } finally {
    loading.value = false
    loaded.value = true
  }
}

async function loadTemplates() {
  if (templates.value.length > 0) return
  try {
    templates.value = await templateApi.list()
  } catch {
    // The template list only fills the choice; the default template still applies.
  }
}

function openCreate() {
  editing.value = null
  form.value = emptyGroupForm()
  dialogError.value = ''
  showEditor.value = true
  void loadTemplates()
}

function openEdit(g: PlanGroup) {
  editing.value = g
  form.value = groupFormFrom(g)
  dialogError.value = ''
  showEditor.value = true
  void loadTemplates()
}

async function save() {
  dialogError.value = validateGroup(form.value, data.value.groups, editing.value?.id ?? null)
  if (dialogError.value) return
  saving.value = true
  try {
    data.value = editing.value
      ? await planGroupApi.update(editing.value.id, form.value)
      : await planGroupApi.create(form.value)
    notice.value = fmt(lan.planGroupSaved, form.value.name.trim())
    showEditor.value = false
  } catch (e) {
    dialogError.value = message(e)
  } finally {
    saving.value = false
  }
}

async function confirmRemove() {
  const g = removing.value
  if (!g) return
  busy.value = true
  error.value = ''
  try {
    data.value = await planGroupApi.remove(g.id)
    notice.value = fmt(lan.planGroupRemoved, g.name)
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
    removing.value = null
  }
}

async function moveType(t: PlanType, groupId: number | null) {
  busyTypeId.value = t.id
  error.value = ''
  try {
    data.value = await planGroupApi.updateType(t.id, t.name, groupId)
  } catch (e) {
    error.value = message(e)
  } finally {
    busyTypeId.value = null
  }
}

async function addType() {
  const code = newCode.value.trim()
  if (!code || code.length > CODE_MAX) {
    error.value = fmt(lan.planGroupCodeRequired, CODE_MAX)
    return
  }
  busy.value = true
  error.value = ''
  try {
    data.value = await planGroupApi.addType(code, newName.value, newGroupId.value)
    notice.value = fmt(lan.planGroupTypeAdded, code)
    newCode.value = ''
    newName.value = ''
    newGroupId.value = null
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}

async function applyNow() {
  applying.value = true
  error.value = ''
  try {
    notice.value = refreshMessage(await planGroupApi.apply())
    await load()
  } catch (e) {
    error.value = message(e)
  } finally {
    applying.value = false
  }
}

onMounted(load)
</script>

<template>
  <v-container id="followup-plan-groups" fluid>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <div class="flex-grow-1">
        <h1 class="text-h5">{{ lan.followUpPlanGroups }}</h1>
        <div class="text-body-2 text-medium-emphasis">{{ lan.planGroupHint }}</div>
      </div>
      <v-btn variant="text" to="/purchase/followup-templates" data-test="to-templates">
        {{ lan.followUpTemplates }}
      </v-btn>
      <v-btn variant="outlined" :loading="loading" data-test="refresh" @click="load">
        {{ lan.refresh }}
      </v-btn>
      <v-btn v-if="canEdit" variant="tonal" :loading="applying" data-test="apply" @click="applyNow">
        {{ lan.planGroupApply }}
      </v-btn>
      <v-btn v-if="canEdit" color="primary" data-test="new" @click="openCreate">
        {{ lan.planGroupNew }}
      </v-btn>
    </div>

    <v-alert
      v-if="loaded && !data.linesSynced"
      type="warning"
      variant="tonal"
      class="mb-2"
      data-test="no-lines"
    >
      {{ lan.planGroupNoLines }}
    </v-alert>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-2" data-test="error">
      {{ error }}
    </v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" class="mb-2" closable data-test="notice">
      {{ notice }}
    </v-alert>

    <div class="text-subtitle-1 mt-2 mb-1">{{ lan.planGroupGroups }}</div>
    <v-table density="comfortable">
      <thead>
        <tr>
          <th>{{ lan.planGroupColName }}</th>
          <th>{{ lan.planGroupColMode }}</th>
          <th>{{ lan.planGroupColTypes }}</th>
          <th>{{ lan.planGroupColTemplate }}</th>
          <th class="text-end">{{ lan.planGroupColOpenOrders }}</th>
          <th v-if="canEdit"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in data.groups" :key="g.id" data-test="group-row">
          <td>
            {{ g.name }}
            <div v-if="g.note" class="text-caption text-medium-emphasis">{{ g.note }}</div>
          </td>
          <td>
            <v-chip
              size="small"
              :color="g.separate ? 'teal' : undefined"
              :variant="g.separate ? 'tonal' : 'outlined'"
              data-test="mode"
            >
              {{ modeLabel(g) }}
            </v-chip>
          </td>
          <td data-test="group-types">
            <span v-if="g.typeCodes.length === 0" class="text-medium-emphasis">—</span>
            <v-chip v-for="c in g.typeCodes" :key="c" size="x-small" class="mr-1 mb-1">
              {{ c }}
            </v-chip>
          </td>
          <td>
            {{ g.separate ? g.templateName || lan.planGroupDefaultTemplate : '—' }}
          </td>
          <td class="text-end">{{ g.separate ? g.openOrders : '—' }}</td>
          <td v-if="canEdit" class="text-end text-no-wrap">
            <v-btn size="small" variant="text" data-test="edit" @click="openEdit(g)">
              {{ lan.fuTplEdit }}
            </v-btn>
            <v-btn
              size="small"
              variant="text"
              color="error"
              data-test="remove"
              @click="removing = g"
            >
              {{ lan.fuTplRemove }}
            </v-btn>
          </td>
        </tr>
        <tr v-if="loaded && !loading && data.groups.length === 0">
          <td
            :colspan="canEdit ? 6 : 5"
            class="text-center text-medium-emphasis py-6"
            data-test="empty"
          >
            {{ lan.planGroupEmpty }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <div class="d-flex align-center flex-wrap ga-2 mt-6 mb-1">
      <div class="text-subtitle-1 flex-grow-1">
        {{ lan.planGroupTypes }}
        <span class="text-caption text-medium-emphasis" data-test="ungrouped">
          {{ fmt(lan.planGroupUngroupedCount, ungrouped) }}
        </span>
      </div>
    </div>
    <div class="text-caption text-medium-emphasis mb-2">{{ lan.planGroupTypesHint }}</div>
    <v-table density="compact">
      <thead>
        <tr>
          <th>{{ lan.planGroupColCode }}</th>
          <th>{{ lan.planGroupColTypeName }}</th>
          <th class="text-end">{{ lan.planGroupColLines }}</th>
          <th>{{ lan.planGroupColLastSeen }}</th>
          <th style="min-width: 220px">{{ lan.planGroupColGroup }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in data.types" :key="t.id" data-test="type-row">
          <td>{{ t.code }}</td>
          <td>{{ t.name || '—' }}</td>
          <td class="text-end">{{ t.lineCount }}</td>
          <td>{{ t.lastSeenAt ? t.lastSeenAt.slice(0, 10) : lan.planGroupAddedByHand }}</td>
          <td>
            <v-select
              v-if="canEdit"
              :model-value="t.groupId"
              :items="groupChoices"
              density="compact"
              hide-details
              :loading="busyTypeId === t.id"
              :data-test="`type-group-${t.code}`"
              @update:model-value="(v: number | null) => moveType(t, v)"
            />
            <span v-else>{{ groupNameOf(t.groupId, data.groups) }}</span>
          </td>
        </tr>
        <tr v-if="loaded && !loading && data.types.length === 0">
          <td colspan="5" class="text-center text-medium-emphasis py-4" data-test="types-empty">
            {{ lan.planGroupTypesEmpty }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <div v-if="canEdit" class="d-flex align-center flex-wrap ga-2 mt-3" data-test="add-type">
      <v-text-field
        v-model="newCode"
        :label="lan.planGroupColCode"
        :counter="CODE_MAX"
        density="compact"
        hide-details
        style="max-width: 180px"
        data-test="new-code"
      />
      <v-text-field
        v-model="newName"
        :label="lan.planGroupColTypeName"
        density="compact"
        hide-details
        style="max-width: 220px"
        data-test="new-name"
      />
      <v-select
        v-model="newGroupId"
        :items="groupChoices"
        :label="lan.planGroupColGroup"
        density="compact"
        hide-details
        style="max-width: 220px"
      />
      <v-btn variant="tonal" :loading="busy" data-test="add-type-btn" @click="addType">
        {{ lan.planGroupAddType }}
      </v-btn>
    </div>

    <v-dialog v-model="showEditor" max-width="640" scrollable>
      <v-card data-test="editor">
        <v-card-title class="text-wrap">
          {{ editing ? fmt(lan.planGroupEditTitle, editing.name) : lan.planGroupCreateTitle }}
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            :label="lan.planGroupName"
            :counter="NAME_MAX"
            data-test="name"
          />
          <v-switch
            v-model="form.separate"
            color="teal"
            :label="lan.planGroupSeparateLabel"
            :hint="form.separate ? lan.planGroupSeparateOn : lan.planGroupSeparateOff"
            persistent-hint
            class="mb-3"
            data-test="separate"
          />
          <v-select
            v-if="form.separate"
            v-model="form.templateId"
            :items="templateChoices"
            :label="lan.planGroupTemplate"
            data-test="template"
          />
          <v-autocomplete
            v-model="form.typeCodes"
            :items="typeChoices"
            :label="lan.planGroupTypesLabel"
            :hint="lan.planGroupTypesMove"
            persistent-hint
            multiple
            chips
            closable-chips
            class="mb-3"
            data-test="types"
          />
          <v-text-field
            v-model="form.note"
            :label="lan.planGroupNote"
            :counter="NOTE_MAX"
            data-test="note"
          />
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
          fmt(lan.planGroupRemoveTitle, removing.name)
        }}</v-card-title>
        <v-card-text>{{ lan.planGroupRemoveHint }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="removing = null">{{ lan.cancel }}</v-btn>
          <v-btn color="error" :loading="busy" data-test="confirm-remove" @click="confirmRemove">
            {{ lan.fuTplRemove }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
