<script setup lang="ts">
import type { Draft, Person } from '@/features/order-audit/model'
import MaterialEvidenceUpload from './MaterialEvidenceUpload.vue'
const draft = defineModel<Draft>({ required: true })
defineProps<{
  users: Person[]
  disabled: boolean
  editing: boolean
  lockReceived?: boolean
  taskId?: string
  lockVersion?: number
  canUploadTask?: boolean
}>()
const emit = defineEmits<{ busy: [boolean] }>()
function addMaterial() {
  draft.value.materials.push({
    id: crypto.randomUUID(),
    name: '',
    required: true,
    status: 3,
    missingParts: '',
    ownerUserId: null,
    expectedAt: null,
    actualAt: null,
    evidenceRef: '',
  })
}
</script>
<template>
  <fieldset :disabled="disabled" class="draft-fields">
    <v-row>
      <v-col cols="12" sm="8"
        ><v-text-field
          v-model="draft.orderNumber"
          label="订单号 *"
          maxlength="50"
          :readonly="editing"
      /></v-col>
      <v-col cols="12" sm="4"
        ><v-text-field
          :model-value="draft.round"
          label="评审轮次 *"
          :readonly="true"
          hint="新建固定首轮，后续轮次由获批重评生成"
          persistent-hint
      /></v-col>
      <v-col cols="12"
        ><v-textarea v-model="draft.title" label="具体事项及交付要求" rows="2"
      /></v-col>
      <v-col cols="12" sm="6"
        ><v-select
          v-model="draft.ownerUserId"
          :items="users"
          item-title="name"
          item-value="id"
          label="责任人"
          clearable
      /></v-col>
      <v-col cols="12" sm="6"
        ><v-text-field
          v-model="draft.receivedAt"
          label="资料接收时间"
          type="datetime-local"
          :readonly="lockReceived"
      /></v-col>
    </v-row>
    <p class="mb-2">
      必备资料清单须经业务确认。每项资料可直接上传凭证并自动填入编号；正式受理前不设置评审期限。
    </p>
    <v-checkbox v-model="draft.checklistConfirmed" label="已核对本轮完整资料清单（含必备项定义）" />
    <v-card v-for="(m, i) in draft.materials" :key="m.id" variant="outlined" class="pa-3 mb-3">
      <v-row>
        <v-col cols="12" sm="8"
          ><v-text-field v-model="m.name" :label="`资料 ${i + 1} 名称 *`"
        /></v-col>
        <v-col cols="12" sm="4"><v-checkbox v-model="m.required" label="受理必备" /></v-col>
        <v-col cols="12" sm="6"
          ><v-select
            v-model="m.status"
            label="提交状态"
            :items="[
              { title: '已提交', value: 1 },
              { title: '部分提交', value: 2 },
              { title: '尚未提交', value: 3 },
            ]"
        /></v-col>
        <v-col cols="12" sm="6"
          ><v-select
            v-model="m.ownerUserId"
            :items="users"
            item-title="name"
            item-value="id"
            label="补交责任人"
            clearable
        /></v-col>
        <v-col v-if="m.status !== 1" cols="12"
          ><v-textarea v-model="m.missingParts" label="缺项及未完成原因 *" rows="2"
        /></v-col>
        <v-col cols="12" sm="6"
          ><v-text-field v-model="m.expectedAt" type="datetime-local" label="预计补齐时间"
        /></v-col>
        <v-col cols="12" sm="6"
          ><v-text-field v-model="m.actualAt" type="datetime-local" label="实际补齐时间"
        /></v-col>
        <v-col cols="12"
          ><MaterialEvidenceUpload
            v-model="m.evidenceRef"
            :material-name="m.name"
            :disabled="disabled"
            :task-id="taskId"
            :lock-version="lockVersion"
            :can-upload-task="canUploadTask"
            @busy="emit('busy', $event)"
        /></v-col>
      </v-row>
      <v-btn color="error" variant="text" @click="draft.materials.splice(i, 1)">移除此项资料</v-btn>
    </v-card>
    <v-btn variant="outlined" @click="addMaterial">添加资料项</v-btn>
  </fieldset>
</template>
<style scoped>
.draft-fields {
  border: 0;
  padding: 0;
  min-width: 0;
}
</style>
