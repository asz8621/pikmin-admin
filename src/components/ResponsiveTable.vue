<script setup>
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '@/stores/useDeviceStore'

defineProps({
  tableData: Array,
  columns: Array, // 每欄定義 { label, prop, slot(optional), fixed(optional), minWidth(optional) }
  loading: Boolean,
})

const deviceStore = useDeviceStore()
const { isPC } = storeToRefs(deviceStore)
</script>

<template>
  <div>
    <!-- 桌機版 -->
    <el-table
      v-if="isPC"
      table-layout="auto"
      :cell-style="{ textAlign: 'center' }"
      :header-cell-style="{ textAlign: 'center' }"
      :data="tableData"
      v-loading="loading"
      cell-class-name="cellStyle"
      style="width: 100%"
    >
      <template v-for="column in columns" :key="column.prop">
        <el-table-column
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :fixed="column.fixed"
        >
          <template v-if="$slots[column.slot]" #default="{ row }">
            <slot :name="column.slot" :row="row" />
          </template>
        </el-table-column>
      </template>

      <el-table-column v-if="$slots.actions" label="操作" fixed="right" width="125">
        <template #default="{ row }">
          <slot name="actions" :row="row" />
        </template>
      </el-table-column>
    </el-table>

    <!-- 手機版 -->
    <div v-else>
      <div
        v-for="row in tableData"
        :key="row.id"
        class="p-4 mb-4 border rounded bg-white shadow-sm"
      >
        <div v-for="column in columns" :key="column.prop" class="mb-2">
          <strong>{{ column.label }}：</strong>
          <template v-if="$slots[column.slot]">
            <slot :name="column.slot" :row="row" />
          </template>
          <template v-else>
            {{ row[column.prop] }}
          </template>
        </div>

        <div v-if="$slots.actions" class="mt-2 flex flex-wrap gap-2">
          <slot name="actions" :row="row" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.cellStyle {
  .cell {
    padding: 0 8px !important;
  }
}
</style>
