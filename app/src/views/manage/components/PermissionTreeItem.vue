<script setup lang="ts">
import { computed } from 'vue'
import { nodeRecordIds, type PermissionNode } from '@/features/permissions/tree'
const props = defineProps<{ node: PermissionNode; selected: number[]; disabled: boolean }>()
const emit = defineEmits<{ toggle: [ids: number[], selected: boolean] }>()
const ids = computed(() => nodeRecordIds(props.node))
const checked = computed(
  () => ids.value.length > 0 && ids.value.every((id) => props.selected.includes(id)),
)
const indeterminate = computed(
  () => !checked.value && ids.value.some((id) => props.selected.includes(id)),
)
</script>
<template>
  <v-list-group v-if="node.children.length" :value="node.key">
    <template #activator="{ props: activator }">
      <v-list-item
        v-bind="activator"
        :title="node.label"
        :subtitle="`${node.code} · 当前页${ids.length}项`"
      >
        <template #prepend>
          <v-list-item-action start @click.stop>
            <v-checkbox-btn
              :model-value="checked"
              :indeterminate="indeterminate"
              :disabled="disabled"
              :aria-label="`选择分组 ${node.code} 的当前页记录`"
              @update:model-value="emit('toggle', ids, $event === true)"
            />
          </v-list-item-action>
        </template>
      </v-list-item>
    </template>
    <v-list-item
      v-for="record in node.records"
      :key="`own:${record.id}`"
      :title="`${node.label}（本级权限）`"
      :subtitle="`${record.permissionCode} · 编号 ${record.id}`"
      class="permission-record"
    >
      <template #prepend
        ><v-list-item-action start
          ><v-checkbox-btn
            :model-value="selected.includes(record.id)"
            :disabled="disabled"
            :aria-label="`选择权限 ${record.permissionCode}，编号 ${record.id}`"
            @update:model-value="
              emit('toggle', [record.id], $event === true)
            " /></v-list-item-action
      ></template>
    </v-list-item>
    <PermissionTreeItem
      v-for="child in node.children"
      :key="child.key"
      :node="child"
      :selected="selected"
      :disabled="disabled"
      @toggle="(ids, selected) => emit('toggle', ids, selected)"
    />
  </v-list-group>
  <template v-else>
    <v-list-item
      v-for="record in node.records"
      :key="record.id"
      :title="node.label"
      :subtitle="`${record.permissionCode} · 编号 ${record.id}`"
      class="permission-record"
    >
      <template #prepend
        ><v-list-item-action start
          ><v-checkbox-btn
            :model-value="selected.includes(record.id)"
            :disabled="disabled"
            :aria-label="`选择权限 ${record.permissionCode}，编号 ${record.id}`"
            @update:model-value="
              emit('toggle', [record.id], $event === true)
            " /></v-list-item-action
      ></template>
    </v-list-item>
  </template>
</template>
<style scoped>
.permission-record :deep(.v-list-item-subtitle) {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
