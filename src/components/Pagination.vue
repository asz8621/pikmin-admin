<script setup>
import { computed } from 'vue'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { storeToRefs } from 'pinia'

const page = defineModel('page')
const limit = defineModel('limit')

defineProps({
  totalCount: Number,
  disabled: Boolean,
})

const deviceStore = useDeviceStore()
const { isPC } = storeToRefs(deviceStore)

const paginationLayout = computed(() => {
  return isPC.value ? 'sizes, total, prev, pager, next, jumper' : 'total, prev, next, jumper'
})

const paginationSize = computed(() => {
  return isPC.value ? 'default' : 'small'
})

const changeLimit = (val) => {
  limit.value = val
  page.value = 1
}

const changePage = (val) => {
  page.value = val
}
</script>

<template>
  <el-pagination
    :current-page="page"
    :page-size="limit"
    :page-sizes="[10, 20, 50, 100]"
    :layout="paginationLayout"
    :size="paginationSize"
    :total="totalCount"
    :disabled="disabled"
    background
    @size-change="changeLimit"
    @current-change="changePage"
  />
</template>

<style lang="scss">
.el-pagination__total {
  margin-right: auto;
}
</style>
