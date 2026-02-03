<script setup>
import { ref, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import axios from '@/plugins/axios'
import ResponsiveTable from '@/components/ResponsiveTable.vue'
import Pagination from '@/components/Pagination.vue'
import ReportsDialog from '@/components/dialogs/ReportsDialog.vue'
import { usePagination } from '@/composables/usePagination'
import { useDialogStore } from '@/stores/useDialogStore'
import { showMessage } from '@/utils/message'
import { formatDate } from '@/utils/formatDate'
import { RefreshCw, Pencil } from 'lucide-vue-next'

const dialogStore = useDialogStore()
const { openDialog, setDialogLoading, closeDialog } = dialogStore
const { isDialogLoading } = storeToRefs(dialogStore)

const columns = [
  { label: '問題類型', prop: 'report_type_name', slot: 'reportTypeName' },
  { label: '使用者', prop: 'username' },
  { label: '狀態', prop: 'status', slot: 'status' },
  { label: '建立時間', prop: 'created_at', slot: 'createdAt' },
]

const statusMap = {
  COMPLETED: {
    text: '已完成',
    class: 'text-green-500',
  },
  PENDING: {
    text: '未完成',
    class: 'text-red-500',
  },
  REJECTED: {
    text: '無法處理',
    class: 'text-yellow-500',
  },
}

const reportTypeData = ref([])
const reportsStatus = [
  { label: '未完成', value: 'PENDING' },
  { label: '無法處理', value: 'REJECTED' },
  { label: '已完成', value: 'COMPLETED' },
]

const getReports = async ({ page = 1, limit = 10, type, status }) => {
  const queryParams = new URLSearchParams()
  queryParams.append('page', page)
  queryParams.append('limit', limit)
  if (type) queryParams.append('type', type)
  if (status) queryParams.append('status', status)

  const res = await axios.get(`/admin/reports?${queryParams.toString()}`)

  if (res.data?.reportTypes) {
    reportTypeData.value = res.data.reportTypes.map((item) => {
      const type = item.code.split('_')[0]
      return {
        ...item,
        name: `[${changeTypeText(type)}] - ${item.name}`,
      }
    })
  }

  return {
    data: res.data.data,
    total: res.data.totalCount,
  }
}

// 單一來源的搜尋條件，傳給 composable
const searchForm = reactive({
  type: '',
  status: '',
})

// 使用 composable，直接傳入 searchForm 作為條件
const { page, limit, totalCount, isLoading, tableData, getData, refresh, submitSearch, onError } =
  usePagination(getReports, searchForm)

// 錯誤處理
onError.value = (error) => {
  const msg = error?.response?.data?.message || '發生未知錯誤，請稍後再試'
  showMessage('error', msg)
}

onMounted(getData)

const changeTypeText = (type) => {
  switch (type) {
    case 'POSTCARD':
      return '明信片'
    case 'PAGE':
      return '頁面'
    case 'OTHER':
      return '其他'
    default:
      return '未知類型'
  }
}

const openModal = (mode, row = null) => {
  const data = { ...row }
  openDialog(mode, data)
}

const handleSubmit = async (data) => {
  if (isDialogLoading.value) return
  setDialogLoading(true)
  try {
    const res = await axios.put(`/admin/reports/${data.id}`, {
      id: data.id,
      message: data.message,
      status: data.status,
    })
    await refresh()
    closeDialog()
    showMessage('success', res.message)
  } catch (error) {
    const defaultMessage = '發生未知錯誤，請稍後再試'
    const message = error.response?.data?.message || error.message || defaultMessage
    showMessage('error', message)
  } finally {
    setDialogLoading(false)
  }
}
</script>

<template>
  <div
    class="p-4"
    :style="{
      backgroundColor: 'var(--el-bg-color)',
      borderColor: 'var(--el-border-color)',
    }"
  >
    <div class="flex flex-wrap gap-4 items-end">
      <el-select
        v-model="searchForm.type"
        placeholder="類型"
        class="w-60"
        :disabled="isLoading"
        clearable
      >
        <el-option label="請選擇" value="" />
        <el-option
          v-for="item in reportTypeData"
          :key="item.id"
          :label="item.name"
          :value="item.id"
        />
      </el-select>

      <el-select
        v-model="searchForm.status"
        placeholder="狀態"
        class="w-40"
        :disabled="isLoading"
        clearable
      >
        <el-option label="請選擇" value="" />
        <el-option
          v-for="item in reportsStatus"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-button type="primary" @click="submitSearch" :disabled="isLoading">搜尋</el-button>
      <el-button class="!ml-auto w-8 h-8" @click="refresh" :disabled="isLoading">
        <RefreshCw class="w-4 h-4" />
      </el-button>
    </div>

    <el-divider class="my-4"></el-divider>

    <ResponsiveTable class="mb-4" :tableData="tableData" :columns="columns" :loading="isLoading">
      <template #reportTypeName="{ row }">
        <span>[{{ changeTypeText(row.type) }}] - {{ row.report_type_name }}</span>
      </template>

      <template #status="{ row }">
        <span :class="['font-bold', statusMap[row.status]?.class]">
          {{ statusMap[row.status]?.text || '未知狀態' }}
        </span>
      </template>

      <template #createdAt="{ row }">
        {{ formatDate(row.created_at) }}
      </template>

      <template #actions="{ row }">
        <el-tooltip content="查看" placement="top">
          <el-button
            class="w-8 h-8 p-0"
            type="primary"
            plain
            size="small"
            @click="() => openModal('reports', row)"
          >
            <Pencil class="w-4 h-4" />
          </el-button>
        </el-tooltip>
      </template>
    </ResponsiveTable>

    <Pagination
      v-model:page="page"
      v-model:limit="limit"
      :totalCount="totalCount"
      :disabled="isLoading"
    />
  </div>

  <ReportsDialog :reportsStatus="reportsStatus" @submit="handleSubmit" />
</template>

<style lang="scss"></style>
