<script setup>
import { reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import axios from '@/plugins/axios'
import Pagination from '@/components/Pagination.vue'
import ResponsiveTable from '@/components/ResponsiveTable.vue'
import PostcardTypeDialog from '@/components/dialogs/PostcardTypeDialog.vue'
import DeleteDialog from '@/components/dialogs/DeleteDialog.vue'
import { usePagination } from '@/composables/usePagination'
import { useDialogStore } from '@/stores/useDialogStore'
import { showMessage } from '@/utils/message'
import { RefreshCw, Pencil, Trash2 } from 'lucide-vue-next'

const dialogStore = useDialogStore()
const { openDialog, closeDialog, setDialogLoading } = dialogStore
const { isDialogLoading, dialogMode } = storeToRefs(dialogStore)

const columns = [
  { label: 'ID', prop: 'id' },
  { label: '類型名稱', prop: 'name' },
]

const getPostcardTypes = async ({ page = 1, limit = 10, name }) => {
  const queryParams = new URLSearchParams()
  queryParams.append('page', page)
  queryParams.append('limit', limit)
  if (name) queryParams.append('name', name)

  const res = await axios.get(`/admin/postcard-types?${queryParams.toString()}`)
  // console.log('[getPostcardTypes]:', { page, limit, name })
  return {
    data: res.data.data,
    total: res.data.totalCount,
  }
}

// 單一來源的搜尋條件，傳給 composable
const searchForm = reactive({
  name: '',
  active: null,
})

// 使用 composable，直接傳入 searchForm 作為條件
const { page, limit, totalCount, isLoading, tableData, getData, refresh, submitSearch, onError } =
  usePagination(getPostcardTypes, searchForm)

// 錯誤處理
onError.value = (error) => {
  const msg = error?.response?.data?.message || '發生未知錯誤，請稍後再試'
  showMessage('error', msg)
}

onMounted(getData)

// 開啟彈窗
const openModal = (mode, row = null) => {
  const validModes = ['add', 'edit', 'delete']
  if (!validModes.includes(mode)) {
    showMessage('error', 'mode 不正確，請稍後再試')
    return
  }

  const initData = {
    add: {
      name: '',
    },
    edit: { ...row },
    delete: { ...row },
  }

  const data = initData[mode]

  openDialog(mode, data)
}

const apiConfig = {
  add: {
    url: '/admin/postcard-types',
    method: 'post',
    error: '新增失敗',
  },
  edit: {
    getUrl: (id) => `/admin/postcard-types/${id}`,
    method: 'put',
    error: '修改失敗',
  },
  delete: {
    getUrl: (id) => `/admin/postcard-types/${id}`,
    method: 'delete',
    error: '刪除失敗',
  },
}

const handleSubmit = async (data) => {
  if (isDialogLoading.value) return
  setDialogLoading(true)
  const mode = dialogMode.value
  const config = apiConfig[mode]
  const errorText = apiConfig[mode].error

  const apiUrl = config.getUrl ? config.getUrl(data.id) : config.url
  const method = config.method

  try {
    const res = await axios[method](apiUrl, data)
    await refresh()
    closeDialog()
    showMessage('success', res.message)
  } catch (error) {
    const defaultMessage = '發生未知錯誤，請稍後再試'
    const message = error.response?.data?.message || error.message || defaultMessage
    showMessage('error', `${errorText}: ${message}`)
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
      <el-input
        v-model="searchForm.name"
        placeholder="請輸入類型名稱"
        class="w-64"
        :disabled="isLoading"
        clearable
      />

      <el-button type="primary" @click="submitSearch" :disabled="isLoading">搜尋</el-button>
      <el-button class="!ml-auto w-8 h-8" @click="refresh" :disabled="isLoading">
        <RefreshCw class="w-4 h-4" />
      </el-button>
    </div>

    <el-divider class="my-4"></el-divider>

    <div class="mb-4">
      <el-button type="primary" :disabled="isLoading" @click="openModal('add')">
        新增類型
      </el-button>
    </div>

    <ResponsiveTable class="mb-4" :tableData="tableData" :columns="columns" :loading="isLoading">
      <template #actions="{ row }">
        <el-tooltip content="編輯" placement="top">
          <el-button
            class="w-8 h-8 p-0"
            type="primary"
            plain
            size="small"
            @click="() => openModal('edit', row)"
          >
            <Pencil class="w-4 h-4" />
          </el-button>
        </el-tooltip>
        <el-tooltip content="刪除" placement="top">
          <el-button
            class="w-8 h-8 p-0"
            type="danger"
            plain
            size="small"
            @click="() => openModal('delete', row)"
          >
            <Trash2 class="w-4 h-4" />
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

  <PostcardTypeDialog @submit="handleSubmit" />

  <DeleteDialog dialogTitle="刪除類型" @submit="handleSubmit" />
</template>

<style lang="scss"></style>
