<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useDialogStore } from '@/stores/useDialogStore'
import { showMessage } from '@/utils/message'
import LocationsImageDialog from '@/components/dialogs/LocationsImageDialog.vue'
import axios from '@/plugins/axios'

defineProps({
  typesData: {
    type: Array,
    default: () => [],
  },
  exploreData: {
    type: Array,
    default: () => [],
  },
  imageStatusData: {
    type: Array,
    default: () => [],
  },
})
const postcardTypes = defineModel('postcardTypes')

const emit = defineEmits(['submit'])

const dialogStore = useDialogStore()
const { closeDialog } = dialogStore
const { isDialogOpen, isDialogLoading, dialogMode, dialogData } = storeToRefs(dialogStore)

const deviceStore = useDeviceStore()
const { isPC, width } = storeToRefs(deviceStore)

const imageUrl = ref('')
const isDialogImageOpen = ref(false)

const dialogWidth = computed(() => {
  return isPC.value ? '800px' : `${width.value - 40}px`
})

const dialogTitle = computed(() => {
  switch (dialogMode.value) {
    case 'add':
      return '新增位置'
    case 'edit':
      return '編輯位置'
    default:
      return ''
  }
})

const rejectedOptions = ref([
  { label: '無法找到相關位置資料', value: '1' },
  { label: '圖片不符合我們的風格要求', value: '2' },
  { label: '其他', value: 'other' },
])

// 駁回原因處理
const changeRejected = (value) => {
  if (value === 'other') {
    dialogData.value.rejected_text = ''
  } else {
    const selectedOption = rejectedOptions.value.find((item) => item.value === value)
    if (selectedOption) {
      dialogData.value.rejected_text = selectedOption.label
    }
  }
}

// 明信片類型處理
const searchKeyword = ref('')
const filteredPostcardTypes = computed(() => {
  if (!searchKeyword.value) return postcardTypes.value
  return postcardTypes.value.filter((item) =>
    item.name.toLowerCase().includes(searchKeyword.value.toLowerCase()),
  )
})
const searchTags = (query) => {
  searchKeyword.value = query
}

const maxFileSize = 3 * 1024 * 1024
const fileList = ref([])

// 上傳中禁止刪除
const handleBeforeRemove = () => {
  if (isDialogLoading.value) return false
  return true
}

// 上傳檔案
const handleFileChange = (file) => {
  if (isDialogLoading.value) return

  const isImage = /image\/(jpeg|png|jpg)/.test(file.raw.type)
  const isSizeValid = file.raw.size <= maxFileSize

  if (!isImage) {
    showMessage('error', '請選擇圖片格式 (.jpg, .jpeg, .png)')
    fileList.value = []
    return
  }

  if (!isSizeValid) {
    showMessage('error', '檔案大小不能超過 3MB')
    fileList.value = []
    return
  }
  dialogData.value.imageFile = null
  fileList.value = [file]
}

// 檢查座標格式
const checkCoordinate = (input) => {
  const coordRegex = /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/
  const match = input.match(coordRegex)

  if (!match) {
    showMessage('error', '座標格式錯誤，請輸入例如：2.3425245, 34.23523552')
    return null
  }

  const lat = parseFloat(match[1])
  const long = parseFloat(match[3])

  if (lat < -90 || lat > 90 || long < -180 || long > 180) {
    showMessage('error', '經緯度超出合理範圍 (緯度 -90~90, 經度 -180~180)')
    return null
  }

  return { lat, long }
}

// 檢查明信片類型
const checkFeatures = (arr) => {
  return Array.isArray(arr) && arr.every((item) => !isNaN(Number(item)))
}

// 檢查其他欄位
const validateLocationData = (data) => {
  const errors = []

  const requiredFields = [
    { field: 'country', label: '國家' },
    { field: 'city', label: '城市' },
    { field: 'name', label: '名稱' },
    { field: 'coordinate', label: '座標' },
  ]

  requiredFields.forEach(({ field, label }) => {
    if (typeof data[field] !== 'string' || data[field].trim() === '') {
      errors.push(`"${label}" 請填寫正確`)
    }
  })

  if (typeof data.explore !== 'boolean') {
    errors.push('"隱藏版" 必須是布林值')
  }

  const allowedTypes = ['mushroom', 'flower']
  if (typeof data.type !== 'string' || !allowedTypes.includes(data.type)) {
    errors.push('"類型" 必須是 mushroom 或 flower')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

const submit = () => {
  if (isDialogLoading.value) return

  if (!checkFeatures(dialogData.value.features)) {
    showMessage('error', '明信片類型錯誤，請重新選擇')
    return
  }

  if (dialogData.value.image_status !== 'rejected' && dialogData.value.features.length === 0) {
    showMessage('error', '明信片類型必須至少選擇一個')
    return
  }

  if (!dialogData.value.image && !dialogData.value.imageFile && !fileList.value.length) {
    showMessage('error', '錯誤: 請選擇一張圖片上傳')
    return
  }

  if (!dialogData.value.image_status) {
    showMessage('error', '請選擇狀態')
    return
  }

  if (dialogData.value.image_status === 'rejected' && !dialogData.value.rejected_value) {
    showMessage('error', '請選擇駁回原因')
    return
  }

  if (dialogData.value.rejected_value === 'other' && !dialogData.value.rejected_text) {
    showMessage('error', '請輸入其他原因')
    return
  }

  // 驗證座標
  const coordinate = checkCoordinate(dialogData.value.coordinate)
  if (!coordinate) return

  // 驗證其他欄位
  const result = validateLocationData(dialogData.value)
  if (!result.valid) {
    result.errors.forEach((error) => showMessage('error', `錯誤: ${error}`))
    return
  }

  // 新增
  if (dialogMode.value === 'add' && !dialogData.value.image) {
    dialogData.value.imageFile = fileList.value[0].raw
  }

  dialogData.value.lat = coordinate.lat
  dialogData.value.long = coordinate.long

  emit('submit', dialogData.value)
}

// 對話框開關移除 file
watch(
  () => isDialogOpen.value,
  (newVal) => {
    if (!newVal) {
      fileList.value = []
      croppedBase64.value = ''
    }
  },
)

// 隱藏版開關
const isExploreDisabled = computed(() => dialogData.value.type === 'mushroom')
watch(
  () => dialogData.value.type,
  (newType) => {
    if (newType === 'mushroom') {
      dialogData.value.explore = false
    }
  },
)

const openImageDialog = () => {
  if (isDialogLoading.value) return
  imageUrl.value = dialogData.value.image
  isDialogImageOpen.value = true
}
const croppedBase64 = ref('')
const cropped = ({ base64, file }) => {
  if (file && base64) {
    dialogData.value.imageFile = file
    croppedBase64.value = base64
  }
}
const isLocationLoading = ref(false)
const getLocation = async () => {
  isLocationLoading.value = true
  try {
    const coordinate = checkCoordinate(dialogData.value.coordinate)
    const locationInfo = await axios.post('/admin/locationInfo', coordinate)
    const { city, country } = locationInfo.data.data
    dialogData.value.country = country
    dialogData.value.city = city
  } catch (error) {
    showMessage('error', error)
  } finally {
    isLocationLoading.value = false
  }
}

const getLocationName = async () => {
  console.log('getLocationName')
}
</script>

<template>
  <el-dialog
    :width="dialogWidth"
    :title="dialogTitle"
    :model-value="isDialogOpen"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
  >
    <div class="flex flex-col md:flex-row gap-6">
      <div class="w-full md:w-[200px] flex flex-col gap-3">
        <div v-if="dialogData.image">
          <img
            :src="dialogData.image"
            alt="圖片預覽"
            class="w-full rounded border border-gray-300"
            style="max-width: 200px; max-height: 200px"
          />
        </div>
        <el-upload
          v-if="dialogMode === 'add'"
          :file-list="fileList"
          :show-file-list="true"
          :auto-upload="false"
          :on-change="handleFileChange"
          :before-remove="handleBeforeRemove"
          accept=".jpg,.jpeg,.png"
          class="uploadImg w-full"
          list-type="picture"
        >
          <el-button type="primary" class="w-full" :disabled="isDialogLoading">上傳圖片</el-button>
        </el-upload>
        <el-divider v-if="croppedBase64" />
        <div v-if="dialogMode === 'edit'">
          <div v-if="croppedBase64">
            <img :src="croppedBase64" alt="" style="max-width: 200px; max-height: 200px" />
          </div>
          <el-button :disabled="isDialogLoading" @click="openImageDialog">裁切圖片</el-button>
        </div>
      </div>

      <el-form :model="dialogData" :disabled="isDialogLoading" label-width="auto" class="flex-1">
        <el-form-item label="名稱">
          <el-input v-model="dialogData.name" placeholder="請輸入名稱">
            <template #append>
              <el-button :disabled="isDialogLoading" @click="getLocationName">取得名稱</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="座標">
          <el-input v-model="dialogData.coordinate" placeholder="請輸入座標">
            <template #append>
              <el-button :disabled="isDialogLoading" @click="getLocation">取得位置</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="國家">
          <el-input
            v-model="dialogData.country"
            placeholder="請輸入國家"
            :disabled="isLocationLoading"
          />
        </el-form-item>

        <el-form-item label="城市">
          <el-input
            v-model="dialogData.city"
            placeholder="請輸入城市"
            :disabled="isLocationLoading"
          />
        </el-form-item>

        <el-form-item label="類型">
          <el-select v-model="dialogData.type">
            <el-option
              v-for="item in typesData"
              :key="item.label"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="明信片類型">
          <el-select
            v-model="dialogData.features"
            multiple
            filterable
            reserve-keyword
            placeholder="請輸入並選擇"
            :filter-method="searchTags"
          >
            <el-option
              v-for="item in filteredPostcardTypes"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="隱藏版">
          <el-switch v-model="dialogData.explore" :disabled="isExploreDisabled">
            <template #active-action><span class="custom-active-action">是</span></template>
            <template #inactive-action><span class="custom-inactive-action">否</span></template>
          </el-switch>
        </el-form-item>

        <el-form-item label="狀態">
          <el-select v-model="dialogData.image_status">
            <el-option
              v-for="item in imageStatusData"
              :key="item.label"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="dialogData.image_status === 'rejected'" label="駁回原因">
          <el-select v-model="dialogData.rejected_value" class="mb-4" @change="changeRejected">
            <el-option
              v-for="item in rejectedOptions"
              :key="item.label"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-input
            v-if="dialogData.rejected_value === 'other'"
            v-model="dialogData.rejected_text"
            :autosize="{ minRows: 4, maxRows: 4 }"
            type="textarea"
            placeholder="請輸入其他原因"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button :disabled="isDialogLoading" @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="isDialogLoading" @click="submit">確認</el-button>
    </template>
  </el-dialog>

  <LocationsImageDialog
    v-model:isDialogImageOpen="isDialogImageOpen"
    v-model:imageUrl="imageUrl"
    @cropped="cropped"
  />
</template>

<style lang="scss">
.uploadImg {
  .el-upload.el-upload--text {
    width: 100%;
  }
  .el-upload-list__item-thumbnail {
    height: 100% !important;
    width: 100% !important;
    max-width: 200px !important;
    max-height: 350px !important;
  }
  .el-upload-list__item-info {
    display: none !important;
  }
  .el-upload-list__item.is-ready {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
  }
}
</style>
