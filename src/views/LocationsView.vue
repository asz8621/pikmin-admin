<script setup>
import { ref, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import axios from '@/plugins/axios'
import Pagination from '@/components/Pagination.vue'
import ResponsiveTable from '@/components/ResponsiveTable.vue'
import LocationsDialog from '@/components/dialogs/LocationsDialog.vue'
import DeleteDialog from '@/components/dialogs/DeleteDialog.vue'
import { usePagination } from '@/composables/usePagination'
import { useDialogStore } from '@/stores/useDialogStore'
import { showMessage } from '@/utils/message'
import { RefreshCw, Pencil, Trash2 } from 'lucide-vue-next'

const dialogStore = useDialogStore()
const { openDialog, closeDialog, setDialogLoading } = dialogStore
const { isDialogLoading, dialogMode } = storeToRefs(dialogStore)

const postcardTypes = ref([])
const columns = [
  { prop: 'id', label: 'ID', width: '50' },
  { prop: 'uploaded_id', label: 'uploaded_id', width: '50' },
  { prop: 'type', label: '類型', slot: 'typeIcon', width: '100' },
  { prop: 'name', label: '名稱', width: '150' },
  { prop: 'country', label: '國家', width: '150' },
  { prop: 'city', label: '城市', width: '150' },
  { prop: 'coordinates', label: '座標', slot: 'coordinates' },
  { prop: 'features', label: '明信片類型', slot: 'features' },
  { prop: 'image_status', label: '狀態', slot: 'imageStatus', width: '100' },
]
const imageStatusMap = {
  pending: {
    label: '審核中',
    class: 'text-gray-500',
  },
  approved: {
    label: '完成',
    class: 'text-green-500',
  },
  rejected: {
    label: '駁回',
    class: 'text-yellow-500',
  },
}
const typesData = [
  { label: '香菇', value: 'mushroom' },
  { label: '花', value: 'flower' },
]
const exploreData = [
  { label: '隱藏版', value: true },
  { label: '非隱藏版', value: false },
]
const imageStatusData = [
  { label: '完成', value: 'approved' },
  { label: '審核中', value: 'pending' },
  { label: '駁回', value: 'rejected' },
]

// 取得圖片路徑
const images = import.meta.glob('@/assets/images/*.png', { eager: true, import: 'default' })
const getImageByType = (type, explore = false) => {
  if (type === 'mushroom') {
    return images['/src/assets/images/mushroom.png']
  }

  if (type === 'flower') {
    return explore
      ? images['/src/assets/images/flower-radar.png']
      : images['/src/assets/images/flower.png']
  }

  return images['/src/assets/images/question-mark.png']
}

const getLocations = async ({
  page = 1,
  limit = 10,
  name,
  country,
  city,
  type,
  explore,
  image_status,
}) => {
  const queryParams = new URLSearchParams()
  queryParams.append('page', page)
  queryParams.append('limit', limit)
  if (name) queryParams.append('name', name)
  if (country) queryParams.append('country', country)
  if (city) queryParams.append('city', city)
  if (type === 'mushroom' || type === 'flower') queryParams.append('type', type)
  if (image_status) queryParams.append('image_status', image_status)
  if (typeof explore === 'boolean') queryParams.append('explore', explore)

  const res = await axios.get(`/admin/locations?${queryParams.toString()}`)
  // console.log('[getLocations]:', { page, limit, name, country, type, explore, image_status })
  postcardTypes.value = res.data.postcardTypes
  return {
    data: res.data.data,
    total: res.data.totalCount,
  }
}

// 單一來源的搜尋條件，傳給 composable
const searchForm = reactive({
  name: '',
  country: '',
  city: '',
  type: null,
  explore: null,
  image_status: null,
})

// 使用 composable，直接傳入 searchForm 作為條件
const { page, limit, totalCount, isLoading, tableData, getData, refresh, submitSearch, onError } =
  usePagination(getLocations, searchForm)

// 錯誤處理
onError.value = (error) => {
  const msg = error?.response?.data?.message || '發生未知錯誤，請稍後再試'
  showMessage('error', msg)
}

onMounted(getData)

const openModal = (mode, row) => {
  const validModes = ['add', 'edit', 'delete']
  if (!validModes.includes(mode)) {
    showMessage('error', 'mode 不正確，請稍後再試')
    return
  }
  const initData = {
    add: {
      country: '',
      city: '',
      name: '',
      coordinate: '',
      lat: null,
      long: null,
      explore: false,
      type: 'mushroom',
      features: [],
      image: null,
    },
    edit: {
      ...row,
      coordinate: `${row?.lat}, ${row?.long}`,
      features: row?.features.map((item) => item.id),
    },
    delete: { ...row },
  }

  const data = initData[mode]

  openDialog(mode, data)
}

const apiConfig = {
  add: {
    url: '/admin/locations',
    method: 'post',
    error: '新增失敗',
  },
  edit: {
    getUrl: (id) => `/admin/locations/${id}`,
    method: 'put',
    error: '修改失敗',
  },
  delete: {
    getUrl: (id) => `/admin/locations/${id}`,
    method: 'delete',
    error: '刪除失敗',
  },
}

const handleSubmit = async (data) => {
  const apiData = { ...data }

  console.log('apiData:', apiData)

  apiData.features = JSON.stringify(apiData.features)
  delete apiData.coordinate

  const formData = new FormData()
  for (const [key, value] of Object.entries(apiData)) {
    formData.append(key, value)
  }

  if (isDialogLoading.value) return
  setDialogLoading(true)
  const mode = dialogMode.value
  const config = apiConfig[mode]
  const errorText = apiConfig[mode].error

  const apiUrl = config.getUrl ? config.getUrl(apiData.id) : config.url
  const method = config.method

  try {
    const res = await axios[method](apiUrl, formData)
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
        class="w-48"
        :disabled="isLoading"
        clearable
      />

      <el-input
        v-model="searchForm.country"
        placeholder="請輸入國家"
        class="w-48"
        :disabled="isLoading"
        clearable
      />
      <el-input
        v-model="searchForm.city"
        placeholder="請輸入城市"
        class="w-48"
        :disabled="isLoading"
        clearable
      />

      <el-select
        v-model="searchForm.type"
        placeholder="請選擇類型"
        class="w-48"
        :disabled="isLoading"
        clearable
      >
        <el-option label="請選擇" value="" />
        <el-option
          v-for="item in typesData"
          :key="item.label"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        v-model="searchForm.explore"
        placeholder="請選擇隱藏版"
        class="w-48"
        :disabled="isLoading"
        clearable
      >
        <el-option label="請選擇" value="" />
        <el-option
          v-for="item in exploreData"
          :key="item.label"
          :label="item.label"
          :value="item.value"
        />
      </el-select>

      <el-select
        v-model="searchForm.image_status"
        placeholder="請選擇狀態"
        class="w-48"
        :disabled="isLoading"
        clearable
      >
        <el-option label="請選擇" value="" />
        <el-option
          v-for="item in imageStatusData"
          :key="item.label"
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

    <div class="mb-4">
      <el-button type="primary" :disabled="isLoading" @click="openModal('add')">
        新增位置
      </el-button>
    </div>

    <ResponsiveTable class="mb-4" :columns="columns" :tableData="tableData" :loading="isLoading">
      <template #typeIcon="{ row }">
        <img
          :src="getImageByType(row.type, row.explore)"
          alt="icon"
          class="w-8 h-8 object-contain inline-block"
        />
      </template>

      <template #coordinates="{ row }"> {{ row.lat }}, {{ row.long }} </template>

      <template #features="{ row }">
        <el-tag v-for="tag in row.features" :key="tag" class="tag-item mr-1" type="primary">
          {{ tag.name }}
        </el-tag>
      </template>

      <template #imageStatus="{ row }">
        <span :class="imageStatusMap[row.image_status]?.class || 'text-red-500'" class="font-bold">
          {{ imageStatusMap[row.image_status]?.label || '異常' }}
        </span>
      </template>

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

  <LocationsDialog
    :postcardTypes="postcardTypes"
    :typesData="typesData"
    :exploreData="exploreData"
    :imageStatusData="imageStatusData"
    @submit="handleSubmit"
  />

  <DeleteDialog dialogTitle="刪除位置" @submit="handleSubmit" />
</template>

<style lang="scss"></style>
