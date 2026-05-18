<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useDialogStore } from '@/stores/useDialogStore'
import { showMessage } from '@/utils/message'
import LocationsImageDialog from '@/components/dialogs/LocationsImageDialog.vue'
import OCRImage from '@/components/dialogs/OCRImageDialog.vue'
import axios from '@/plugins/axios'
import Tesseract from 'tesseract.js'

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
const originalImagePreview = ref('')
const cropResultBase64 = ref('')
const cropResultFile = ref(null)
const cropResultType = ref('')
const titleRegionBase64 = ref('')
const suggestedName = ref('')
const isAssistLoading = ref(false)
const isAutoOCRLoading = ref(false)
const hasOriginalImage = computed(() => Boolean(dialogData.value.image || fileList.value.length))
const originalImageSource = computed(() => {
  if (fileList.value.length > 0) return fileList.value[0].raw
  return dialogData.value.image || ''
})
const originalPreviewSrc = computed(
  () => originalImagePreview.value || dialogData.value.image || '',
)
const cropResultLabel = computed(() =>
  cropResultType.value === 'manual' ? '手動裁切結果' : '自動裁切結果',
)

// 上傳中禁止刪除
const handleBeforeRemove = () => {
  if (isDialogLoading.value) return false
  return true
}

// 上傳檔案
const handleFileChange = async (file) => {
  if (isDialogLoading.value) return

  const isImage = /image\/(jpeg|png|jpg)/.test(file.raw.type)
  const isSizeValid = file.raw.size <= maxFileSize

  if (!isImage) {
    showMessage('error', '請選擇圖片格式 (.jpg, .jpeg, .png)')
    fileList.value = []
    originalImagePreview.value = ''
    resetCropResult()
    return
  }

  if (!isSizeValid) {
    showMessage('error', '檔案大小不能超過 3MB')
    fileList.value = []
    originalImagePreview.value = ''
    resetCropResult()
    return
  }
  dialogData.value.imageFile = null
  fileList.value = [file]
  try {
    originalImagePreview.value = await sourceToDataUrl(file.raw)
  } catch {
    originalImagePreview.value = ''
  }
  resetCropResult()
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
  if (dialogData.value.image_status !== 'rejected') {
    const result = validateLocationData(dialogData.value)
    if (!result.valid) {
      result.errors.forEach((error) => showMessage('error', `錯誤: ${error}`))
      return
    }
  }

  // 新增
  if (dialogMode.value === 'add' && !dialogData.value.image && !dialogData.value.imageFile) {
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
      originalImagePreview.value = ''
      resetCropResult()
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

// 開啟手動裁切視窗
const openImageDialog = async () => {
  if (isDialogLoading.value) return
  imageUrl.value = await sourceToDataUrl(originalImageSource.value)
  isDialogImageOpen.value = true
}

// 手動裁切結果，並統一寫入目前要送出的圖片檔案
const cropped = ({ base64, file }) => {
  if (file && base64) {
    dialogData.value.imageFile = file
    cropResultBase64.value = base64
    cropResultFile.value = file
    cropResultType.value = 'manual'
    titleRegionBase64.value = ''
    suggestedName.value = ''
  }
}

// 清空裁切結果、標題區域與 OCR 文字
const resetCropResult = () => {
  cropResultBase64.value = ''
  cropResultFile.value = null
  cropResultType.value = ''
  titleRegionBase64.value = ''
  suggestedName.value = ''
  dialogData.value.imageFile = null
}

// 將 canvas 產生的 base64 圖片轉回 File，方便沿用既有上傳流程
const base64ToFile = (base64, filename = 'review-crop.png') => {
  const arr = base64.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(arr[1])
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new File([bytes], filename, { type: mime })
}

// 將 Blob/File 轉成 data URL，供圖片預覽、canvas 與 OCR 使用
const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

// 將圖片網址或本機 File 統一轉成 data URL
const sourceToDataUrl = async (source) => {
  if (!source) throw new Error('沒有可處理的圖片')
  if (typeof source === 'string' && source.startsWith('data:image')) return source
  if (typeof source === 'string') {
    const res = await fetch(source, { mode: 'cors' })
    const blob = await res.blob()
    return readBlobAsDataUrl(blob)
  }
  return readBlobAsDataUrl(source)
}

// 載入圖片物件，讓後續 canvas 可以讀取原始寬高與像素
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

// 把圖片畫到 canvas，作為像素分析與裁切的基礎
const drawImageCanvas = (img) => {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)
  return canvas
}

// 判斷像素是否接近 Pikmin 明信片卡片的藍色背景
const isCardBlue = (r, g, b) => {
  return r < 85 && g >= 35 && g <= 125 && b >= 90 && b <= 185 && b - r > 45 && b - g > 20
}

// 判斷像素是否接近標題文字使用的白色
const isWhiteText = (r, g, b) => {
  return r > 175 && g > 175 && b > 175 && Math.max(r, g, b) - Math.min(r, g, b) < 70
}

// 從掃描分數中找出最長的連續有效區段
const findLongestSegment = (scores, minScore, startIndex, endIndex) => {
  let bestStart = -1
  let bestEnd = -1
  let currentStart = -1

  for (let i = startIndex; i <= endIndex; i += 1) {
    if (scores[i] >= minScore) {
      if (currentStart === -1) currentStart = i
    } else if (currentStart !== -1) {
      if (i - currentStart > bestEnd - bestStart) {
        bestStart = currentStart
        bestEnd = i - 1
      }
      currentStart = -1
    }
  }

  if (currentStart !== -1 && endIndex + 1 - currentStart > bestEnd - bestStart) {
    bestStart = currentStart
    bestEnd = endIndex
  }

  return bestStart === -1 ? null : { start: bestStart, end: bestEnd }
}

// 從掃描分數中找出多個連續有效區段
const findSegments = (scores, minScore, startIndex, endIndex, minLength = 1) => {
  const segments = []
  let currentStart = -1

  for (let i = startIndex; i <= endIndex; i += 1) {
    if (scores[i] >= minScore) {
      if (currentStart === -1) currentStart = i
    } else if (currentStart !== -1) {
      if (i - currentStart >= minLength) {
        segments.push({ start: currentStart, end: i - 1 })
      }
      currentStart = -1
    }
  }

  if (currentStart !== -1 && endIndex + 1 - currentStart >= minLength) {
    segments.push({ start: currentStart, end: endIndex })
  }

  return segments
}

// 偵測整張 Pikmin 明信片藍色卡片的位置
const detectCardRect = (canvas) => {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  const rowScores = new Array(height).fill(0)
  const colScores = new Array(width).fill(0)

  for (let y = Math.floor(height * 0.04); y < Math.floor(height * 0.95); y += 1) {
    for (let x = Math.floor(width * 0.02); x < Math.floor(width * 0.98); x += 1) {
      const index = (y * width + x) * 4
      if (isCardBlue(data[index], data[index + 1], data[index + 2])) {
        rowScores[y] += 1
        colScores[x] += 1
      }
    }
  }

  const xBand = findLongestSegment(
    colScores,
    height * 0.035,
    Math.floor(width * 0.02),
    Math.floor(width * 0.98),
  )
  const yBand = findLongestSegment(
    rowScores,
    width * 0.035,
    Math.floor(height * 0.04),
    Math.floor(height * 0.95),
  )

  if (!xBand || !yBand) {
    return {
      x: Math.round(width * 0.03),
      y: Math.round(height * 0.06),
      width: Math.round(width * 0.94),
      height: Math.round(height * 0.56),
    }
  }

  const padX = Math.round(width * 0.01)
  const padY = Math.round(height * 0.01)
  const x = Math.max(0, xBand.start - padX)
  const y = Math.max(0, yBand.start - padY)
  const right = Math.min(width, xBand.end + padX)
  const bottom = Math.min(height, yBand.end + padY)

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  }
}

// 在卡片範圍內偵測實際照片區域
const detectPhotoRect = (canvas, cardRect) => {
  const ctx = canvas.getContext('2d')
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const contentLeft = Math.round(cardRect.x + cardRect.width * 0.055)
  const contentRight = Math.round(cardRect.x + cardRect.width * 0.945)
  const scanTop = Math.round(cardRect.y + cardRect.height * 0.04)
  const scanBottom = Math.round(cardRect.y + cardRect.height * 0.8)
  const contentWidth = contentRight - contentLeft
  const rowScores = new Array(canvas.height).fill(0)

  for (let y = scanTop; y <= scanBottom; y += 1) {
    for (let x = contentLeft; x <= contentRight; x += 1) {
      const index = (y * canvas.width + x) * 4
      if (!isCardBlue(data[index], data[index + 1], data[index + 2])) {
        rowScores[y] += 1
      }
    }
  }

  const yBand = findLongestSegment(rowScores, contentWidth * 0.55, scanTop, scanBottom)
  if (!yBand) {
    return {
      x: contentLeft,
      y: scanTop,
      width: contentWidth,
      height: cardRect.height * 0.58,
    }
  }

  const segmentHeight = yBand.end - yBand.start + 1
  const colScores = new Array(canvas.width).fill(0)
  for (let x = contentLeft; x <= contentRight; x += 1) {
    for (let y = yBand.start; y <= yBand.end; y += 1) {
      const index = (y * canvas.width + x) * 4
      if (!isCardBlue(data[index], data[index + 1], data[index + 2])) {
        colScores[x] += 1
      }
    }
  }

  const xBand = findLongestSegment(colScores, segmentHeight * 0.55, contentLeft, contentRight)
  const x = xBand?.start ?? contentLeft
  const right = xBand?.end ?? contentRight

  return {
    x,
    y: yBand.start,
    width: right - x + 1,
    height: segmentHeight,
  }
}

// 依照偵測到的矩形區域裁出新的 canvas
const cropCanvas = (canvas, rect) => {
  const output = document.createElement('canvas')
  output.width = Math.max(1, Math.round(rect.width))
  output.height = Math.max(1, Math.round(rect.height))
  const ctx = output.getContext('2d')
  ctx.drawImage(
    canvas,
    Math.round(rect.x),
    Math.round(rect.y),
    Math.round(rect.width),
    Math.round(rect.height),
    0,
    0,
    output.width,
    output.height,
  )
  return output
}

// 標題偵測失敗時，用照片下方的固定比例作為備援標題區域
const getFallbackTitleRect = (cardRect, photoRect) => {
  const y = photoRect.y + photoRect.height + cardRect.height * 0.035
  const bottom = Math.min(cardRect.y + cardRect.height * 0.86, y + cardRect.height * 0.2)

  return {
    x: cardRect.x + cardRect.width * 0.06,
    y,
    width: cardRect.width * 0.88,
    height: Math.max(cardRect.height * 0.08, bottom - y),
  }
}

// 依據白色粗體文字像素，偵測照片下方的標題區域
const detectTitleRect = (canvas, cardRect, photoRect) => {
  const fallback = getFallbackTitleRect(cardRect, photoRect)
  const ctx = canvas.getContext('2d')
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const contentLeft = Math.round(cardRect.x + cardRect.width * 0.06)
  const contentRight = Math.round(cardRect.x + cardRect.width * 0.94)
  const scanTop = Math.round(photoRect.y + photoRect.height + cardRect.height * 0.015)
  const scanBottom = Math.round(cardRect.y + cardRect.height * 0.92)
  const contentWidth = contentRight - contentLeft
  const rowScores = new Array(canvas.height).fill(0)

  for (let y = scanTop; y <= scanBottom; y += 1) {
    for (let x = contentLeft; x <= contentRight; x += 1) {
      const index = (y * canvas.width + x) * 4
      if (isWhiteText(data[index], data[index + 1], data[index + 2])) {
        rowScores[y] += 1
      }
    }
  }

  const textBands = findSegments(
    rowScores,
    Math.max(2, contentWidth * 0.006),
    scanTop,
    scanBottom,
    Math.max(2, Math.round(cardRect.height * 0.004)),
  )

  if (!textBands.length) return fallback

  const selectedBands = [textBands[0]]
  const firstHeight = textBands[0].end - textBands[0].start + 1

  for (let i = 1; i < textBands.length && selectedBands.length < 3; i += 1) {
    const previousBand = selectedBands[selectedBands.length - 1]
    const band = textBands[i]
    const gap = band.start - previousBand.end - 1
    const height = band.end - band.start + 1

    if (gap <= cardRect.height * 0.025 && height >= firstHeight * 0.65) {
      selectedBands.push(band)
    } else {
      break
    }
  }

  const padY = Math.max(2, Math.round(cardRect.height * 0.006))
  const top = Math.max(scanTop, selectedBands[0].start - padY)
  const bottom = Math.min(scanBottom, selectedBands[selectedBands.length - 1].end + padY)
  const colScores = new Array(canvas.width).fill(0)

  for (let x = contentLeft; x <= contentRight; x += 1) {
    for (let y = top; y <= bottom; y += 1) {
      const index = (y * canvas.width + x) * 4
      if (isWhiteText(data[index], data[index + 1], data[index + 2])) {
        colScores[x] += 1
      }
    }
  }

  let textLeft = -1
  let textRight = -1
  for (let x = contentLeft; x <= contentRight; x += 1) {
    if (colScores[x] > 0) {
      if (textLeft === -1) textLeft = x
      textRight = x
    }
  }

  if (textLeft === -1 || textRight === -1) return fallback

  const padX = Math.max(4, Math.round(cardRect.width * 0.015))
  const left = Math.max(contentLeft, textLeft - padX)
  const right = Math.min(contentRight, textRight + padX)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

// 自動裁切照片與標題區域，並把照片裁切結果設為待上傳圖片
const buildReviewAssist = async () => {
  if (isAssistLoading.value) return

  isAssistLoading.value = true
  try {
    const dataUrl = await sourceToDataUrl(originalImageSource.value)
    const img = await loadImage(dataUrl)
    const canvas = drawImageCanvas(img)
    const cardRect = detectCardRect(canvas)
    const photoRect = detectPhotoRect(canvas, cardRect)
    const titleRect = detectTitleRect(canvas, cardRect, photoRect)
    const photoCanvas = cropCanvas(canvas, photoRect)
    const titleCanvas = cropCanvas(canvas, titleRect)

    cropResultBase64.value = photoCanvas.toDataURL('image/png')
    cropResultFile.value = base64ToFile(cropResultBase64.value)
    cropResultType.value = 'auto'
    dialogData.value.imageFile = cropResultFile.value
    titleRegionBase64.value = titleCanvas.toDataURL('image/png')
    suggestedName.value = ''
    showMessage('success', '已完成自動裁切')
  } catch (error) {
    showMessage('error', error.message || '自動裁切失敗')
  } finally {
    isAssistLoading.value = false
  }
}

// 清理 OCR 結果，移除距離資訊與多餘換行
const cleanOCRName = (text) => {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/[|]/g, '').trim())
    .filter(Boolean)
    .filter((line) => !/^距\s*離/.test(line))
    .filter((line) => !/^[\d,.]+\s*m/i.test(line))

  return lines
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// 對標題區域執行 OCR，產生可套用的建議名稱
const runSuggestedNameOCR = async () => {
  if (isAutoOCRLoading.value) return

  isAutoOCRLoading.value = true
  try {
    if (!titleRegionBase64.value) {
      await buildReviewAssist()
    }
    if (!titleRegionBase64.value) throw new Error('沒有可辨識的標題區域')

    const result = await Tesseract.recognize(titleRegionBase64.value, 'eng+jpn+chi_tra')
    const name = cleanOCRName(result.data.text)
    if (!name) throw new Error('辨識結果為空，請改用手動 OCR')

    suggestedName.value = name
    showMessage('success', '已產生建議名稱')
  } catch (error) {
    showMessage('error', error.message || '自動辨識名稱失敗')
  } finally {
    isAutoOCRLoading.value = false
  }
}

// 將 OCR 建議名稱套用到表單名稱欄位
const applySuggestedName = () => {
  if (!suggestedName.value) return
  dialogData.value.name = suggestedName.value
}

// 移除 OCR 建議名稱中的所有空白字元
const removeSuggestedNameSpaces = () => {
  suggestedName.value = suggestedName.value.replace(/\s+/g, '')
}

// 取得位置資訊
const isLocationLoading = ref(false)
const getLocation = async () => {
  isLocationLoading.value = true
  try {
    const coordinate = checkCoordinate(dialogData.value.coordinate)
    const locationInfo = await axios.post('/admin/location-reviews/location-info', coordinate)
    const { city, country } = locationInfo.data.data
    dialogData.value.country = country
    dialogData.value.city = city
  } catch (error) {
    showMessage('error', error)
  } finally {
    isLocationLoading.value = false
  }
}

// 取得 OCR 名稱
const isOCRDialogOpen = ref(false)
const ocrImage = ref(null)
// 開啟手動 OCR 視窗，固定使用原始圖片作為辨識來源
const getLocationName = async () => {
  ocrImage.value = await sourceToDataUrl(originalImageSource.value)
  isOCRDialogOpen.value = true
}
const ocrFinished = (text) => {
  dialogData.value.name = text
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
    <div class="flex flex-col md:flex-row gap-8">
      <div class="w-full md:w-[200px] flex flex-col gap-3">
        <div v-if="originalPreviewSrc">
          <img
            :src="originalPreviewSrc"
            alt="圖片預覽"
            class="w-full max-h-[200px] object-contain"
          />
        </div>
        <el-upload
          v-if="dialogMode === 'add'"
          :file-list="fileList"
          :show-file-list="false"
          :auto-upload="false"
          :on-change="handleFileChange"
          :before-remove="handleBeforeRemove"
          accept=".jpg,.jpeg,.png"
          class="uploadImg w-full"
        >
          <el-button type="primary" class="w-full" :disabled="isDialogLoading">
            {{ hasOriginalImage ? '重新上傳圖片' : '上傳圖片' }}
          </el-button>
        </el-upload>

        <div v-if="hasOriginalImage" class="grid grid-cols-2 gap-2">
          <el-button :disabled="isDialogLoading" @click="openImageDialog"> 手動裁切 </el-button>
          <el-button
            :loading="isAssistLoading"
            :disabled="isDialogLoading || isAutoOCRLoading"
            @click="buildReviewAssist"
          >
            自動裁切
          </el-button>
        </div>

        <el-divider v-if="cropResultBase64 || titleRegionBase64" class="m-0" />

        <div v-if="cropResultBase64" class="flex flex-col gap-2">
          <span class="text-sm text-gray-600">{{ cropResultLabel }}</span>
          <img :src="cropResultBase64" alt="裁切結果" class="w-full max-h-[200px] object-contain" />
        </div>

        <div v-if="titleRegionBase64" class="flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">標題區域</span>
            <el-button
              :loading="isAutoOCRLoading"
              :disabled="isDialogLoading || isAssistLoading"
              @click="runSuggestedNameOCR"
            >
              自動辨識
            </el-button>
          </div>
          <img
            :src="titleRegionBase64"
            alt="標題區域"
            class="w-full max-h-[110px] object-contain"
          />

          <div v-if="suggestedName" class="flex flex-col gap-2">
            <el-input v-model="suggestedName" placeholder="請輸入名稱" type="textarea"> </el-input>
            <div class="flex justify-between items-center">
              <el-button @click="removeSuggestedNameSpaces">去除空白</el-button>
              <el-button
                type="primary"
                plain
                :disabled="isDialogLoading"
                @click="applySuggestedName"
              >
                套用
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <el-form :model="dialogData" :disabled="isDialogLoading" label-width="auto" class="flex-1">
        <el-form-item label="名稱">
          <el-input v-model="dialogData.name" placeholder="請輸入名稱">
            <template #append>
              <el-button :disabled="isDialogLoading" @click="getLocationName">手動 OCR</el-button>
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
          <el-switch v-model="dialogData.explore" :disabled="isExploreDisabled" class="select-none">
            <template #active-action>
              <span>是</span>
            </template>
            <template #inactive-action>
              <span>否</span>
            </template>
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

  <OCRImage
    v-model:isOCRDialogOpen="isOCRDialogOpen"
    :imageUrl="ocrImage"
    @ocrFinished="ocrFinished"
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
