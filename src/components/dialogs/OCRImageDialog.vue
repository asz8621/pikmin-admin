<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import Tesseract from 'tesseract.js'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { showMessage } from '@/utils/message'

const props = defineProps({
  imageUrl: [String, File],
})

const emit = defineEmits(['ocrFinished'])

const isOCRDialogOpen = defineModel('isOCRDialogOpen')

const deviceStore = useDeviceStore()
const { isPC, width } = storeToRefs(deviceStore)

const dialogWidth = computed(() => {
  return isPC.value ? '800px' : `${width.value - 40}px`
})

const isOCRLoading = ref(false)
const imgSrc = ref('')
const image = ref(null)
const container = ref(null)
const selectionDone = ref(false)
const ocrText = ref('')
const ocrWaitText = ref('')
const mode = ref('move') // 'move' | 'select'
const ocrSuccess = ref(false)
const isMovable = ref(true)
const langs = ref([])
const langOptions = [
  { value: 'eng', label: '英文(en)' },
  { value: 'deu', label: '德文(de)' },
  { value: 'fra', label: '法文(fr)' },
  { value: 'spa', label: '西班牙文(es)' },
  { value: 'por', label: '葡萄牙文(pt)' },
  { value: 'ita', label: '義大利文(it)' },
  { value: 'nld', label: '荷蘭文(nl)' },
  { value: 'swe', label: '瑞典文(sv)' },
  { value: 'dan', label: '丹麥文(da)' },
  { value: 'nor', label: '挪威文(no)' },
  { value: 'jpn', label: '日文(jp)' },
  { value: 'kor', label: '韓文(ko)' },
  { value: 'chi_sim', label: '簡體中文(zh-CN)' },
  { value: 'chi_tra', label: '繁體中文(zh-TW)' },
  { value: 'hin', label: '印地語(hi)' },
  { value: 'ben', label: '孟加拉文(bn)' },
  { value: 'tam', label: '泰米爾文(ta)' },
  { value: 'tel', label: '泰盧固文(te)' },
  { value: 'guj', label: '古吉拉特文(gu)' },
  { value: 'mal', label: '馬拉雅拉姆文(ml)' },
  { value: 'mar', label: '馬拉地文(mr)' },
  { value: 'pan', label: '旁遮普文(pa)' },
  { value: 'san', label: '梵文(sa)' },
  { value: 'ara', label: '阿拉伯文(ar)' },
  { value: 'heb', label: '希伯來文(he)' },
  { value: 'rus', label: '俄文(ru)' },
  { value: 'ukr', label: '烏克蘭文(uk)' },
  { value: 'tur', label: '土耳其文(tr)' },
  { value: 'tha', label: '泰文(th)' },
  { value: 'vie', label: '越南文(vi)' },
  { value: 'uzb', label: '烏茲別克文(uz)' },
  { value: 'ell', label: '希臘文(el)' },
  { value: 'grc', label: '古希臘語(gre)' },
]

// tesseract 辨識語系設定
const langString = computed(() => {
  return langs.value.length > 0 ? langs.value.join('+') : 'eng'
})

const selection = reactive({
  visible: false,
  startX: 0,
  startY: 0,
  left: 0,
  top: 0,
  width: 0,
  height: 0,
})

const naturalWidth = ref(0)
const imageWidth = ref(0)

const translateX = ref(0)
const translateY = ref(0)
const dragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
const originTranslate = reactive({ x: 0, y: 0 })

watch(
  () => props.imageUrl,
  async (val) => {
    if (!val) return
    ocrText.value = ''
    ocrWaitText.value = ''
    selectionDone.value = false
    try {
      if (typeof val === 'string') {
        if (val.startsWith('data:image')) {
          imgSrc.value = val
        } else {
          imgSrc.value = await convertImageUrlToBase64(val)
        }
      } else if (val instanceof File) {
        imgSrc.value = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(val)
        })
      }
    } catch {
      showMessage('error', '圖片載入失敗，請新整理後再試')
      imgSrc.value = ''
    }
  },
  { immediate: true },
)

// 根據圖片與容器大小計算圖片平移的初始座標
const resetTranslate = () => {
  const img = image.value
  const containerEl = container.value
  if (!img || !containerEl) return

  const containerWidth = containerEl.clientWidth
  const containerHeight = containerEl.clientHeight

  const imgDisplayWidth = imageWidth.value
  const imgDisplayHeight = (img.naturalHeight * imgDisplayWidth) / img.naturalWidth

  // 如果圖片比容器小，才置中，否則靠左上
  translateX.value = imgDisplayWidth < containerWidth ? (containerWidth - imgDisplayWidth) / 2 : 0

  translateY.value =
    imgDisplayHeight < containerHeight ? (containerHeight - imgDisplayHeight) / 2 : 0

  originTranslate.x = translateX.value
  originTranslate.y = translateY.value
}

// 將圖片 URL 轉換為 Base64 編碼
const convertImageUrlToBase64 = async (url) => {
  const res = await fetch(url, { mode: 'cors' })
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 圖片載入完成後的處理
const onImageLoad = async () => {
  const img = image.value
  const containerEl = container.value
  naturalWidth.value = img.naturalWidth

  const containerWidth = containerEl.clientWidth
  const containerHeight = containerEl.clientHeight

  if (img.naturalWidth > containerWidth) {
    imageWidth.value = containerWidth
  } else {
    imageWidth.value = img.naturalWidth
  }

  await nextTick()

  // 計算顯示後圖片尺寸
  const imgDisplayWidth = imageWidth.value
  const imgDisplayHeight = (img.naturalHeight * imgDisplayWidth) / img.naturalWidth

  // 設定是否可移動
  isMovable.value = imgDisplayWidth > containerWidth || imgDisplayHeight > containerHeight

  resetTranslate()
}

// 取得滑鼠或觸控事件用於畫框選取
const getEventPosition = (e, rect) => {
  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    }
  } else {
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }
}

// 開始拖曳圖片
const startDrag = (e) => {
  if (mode.value !== 'move') return
  e.preventDefault()
  dragging.value = true
  dragStart.x = e.touches ? e.touches[0].clientX : e.clientX
  dragStart.y = e.touches ? e.touches[0].clientY : e.clientY
  originTranslate.x = translateX.value
  originTranslate.y = translateY.value

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('touchend', stopDrag)
}

// 計算拖曳後的新平移座標，並限制不能超出容器邊界
const onDrag = (e) => {
  if (!dragging.value || !isMovable.value) return
  e.preventDefault()
  const currentX = e.touches ? e.touches[0].clientX : e.clientX
  const currentY = e.touches ? e.touches[0].clientY : e.clientY
  const deltaX = currentX - dragStart.x
  const deltaY = currentY - dragStart.y

  const containerRect = container.value.getBoundingClientRect()
  const imgHeight = (image.value.naturalHeight * imageWidth.value) / naturalWidth.value

  // 計算邊界限制
  const maxTranslateX = 0
  const maxTranslateY = 0
  const minTranslateX = containerRect.width - imageWidth.value
  const minTranslateY = containerRect.height - imgHeight

  let newTranslateX = originTranslate.x + deltaX
  let newTranslateY = originTranslate.y + deltaY

  // 限制不超出邊界
  if (newTranslateX > maxTranslateX) newTranslateX = maxTranslateX
  if (newTranslateX < minTranslateX) newTranslateX = minTranslateX
  if (newTranslateY > maxTranslateY) newTranslateY = maxTranslateY
  if (newTranslateY < minTranslateY) newTranslateY = minTranslateY

  translateX.value = newTranslateX
  translateY.value = newTranslateY
}

// 結束拖曳圖片
const stopDrag = () => {
  dragging.value = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
}

// 開始繪製選取框
const startDraw = (e) => {
  if (mode.value !== 'select' || dragging.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const { x, y } = getEventPosition(e, rect)
  selection.startX = x
  selection.startY = y
  selection.left = x
  selection.top = y
  selection.width = 0
  selection.height = 0
  selection.visible = true
  selectionDone.value = false
}

// 繪製選取框
const draw = (e) => {
  if (!selection.visible) return
  e.preventDefault()
  const rect = e.currentTarget.getBoundingClientRect()
  const { x, y } = getEventPosition(e, rect)
  const dx = x - selection.startX
  const dy = y - selection.startY
  selection.left = dx < 0 ? x : selection.startX
  selection.top = dy < 0 ? y : selection.startY
  selection.width = Math.abs(dx)
  selection.height = Math.abs(dy)
}

// 結束繪製選取框
const endDraw = () => {
  if (selection.width > 5 && selection.height > 5) {
    selectionDone.value = true
  } else {
    selection.visible = false
  }
}

// 重置選取狀態
const resetSelection = () => {
  selection.visible = false
  selectionDone.value = false
  ocrSuccess.value = false
  ocrText.value = ''
  ocrWaitText.value = ''
  selection.left = 0
  selection.top = 0
  selection.width = 0
  selection.height = 0
  langs.value = []
}

// 執行 OCR 辨識
const runOCR = async () => {
  isOCRLoading.value = true
  ocrSuccess.value = false
  ocrWaitText.value = ''
  ocrText.value = ''
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = image.value

  const ratio = img.naturalWidth / img.width
  canvas.width = selection.width * ratio
  canvas.height = selection.height * ratio

  ctx.drawImage(
    img,
    selection.left * ratio - translateX.value * ratio,
    selection.top * ratio - translateY.value * ratio,
    selection.width * ratio,
    selection.height * ratio,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const dataUrl = canvas.toDataURL()
  ocrWaitText.value = '正在辨識圖片文字，請稍後...'
  const result = await Tesseract.recognize(dataUrl, langString.value)
  if (!result.data.text.trim()) {
    showMessage('error', '辨識結果為空，請重新選取區域或檢查圖片品質')
    ocrWaitText.value = ''
    ocrText.value = ''
    ocrSuccess.value = false
    isOCRLoading.value = false
    return
  }
  ocrText.value = result.data.text
  ocrWaitText.value = ''
  ocrSuccess.value = true
  isOCRLoading.value = false
}

// 關閉 OCR 對話框並重置狀態
const closeOCRDialog = () => {
  resetSelection()
  mode.value = 'move'
  isOCRDialogOpen.value = false
}

// 去除 OCR 結果中的空格
const removeSpaces = () => {
  ocrText.value = ocrText.value.replace(/\s+/g, '')
}

// 設定 OCR 結果並關閉對話框
const setOCRText = () => {
  emit('ocrFinished', ocrText.value)
  closeOCRDialog()
}

// 計算圖片樣式
const imageStyle = computed(() => {
  let cursor = 'default'
  if (mode.value === 'move') {
    if (isMovable.value) {
      cursor = dragging.value ? 'grabbing' : 'grab'
    }
  }
  return {
    width: imageWidth.value + 'px',
    cursor,
    transform: `translate(${translateX.value}px, ${translateY.value}px)`,
    pointerEvents: mode.value === 'move' && isMovable.value ? 'auto' : 'none',
  }
})
</script>

<template>
  <el-dialog
    class="mt-12"
    title="OCR 辨識"
    :model-value="isOCRDialogOpen"
    :width="dialogWidth"
    :close-on-click-modal="false"
    @close="closeOCRDialog"
  >
    <div class="p-4">
      <div
        v-if="imgSrc"
        ref="container"
        class="relative w-full max-w-[600px] h-[60vh] overflow-hidden bg-[#f5f5f5] mx-auto select-none border rounded-md"
      >
        <img
          ref="image"
          class="absolute top-0 left-0 select-none h-auto"
          :src="imgSrc"
          :style="imageStyle"
          @load="onImageLoad"
          @mousedown="startDrag"
          @touchstart="startDrag"
        />

        <!-- 選取框 -->
        <div
          v-if="selection.visible"
          class="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none"
          :style="{
            left: selection.left + 'px',
            top: selection.top + 'px',
            width: selection.width + 'px',
            height: selection.height + 'px',
          }"
        />

        <!-- 滑鼠事件區 (選取框繪製區) -->
        <div
          v-if="imgSrc && mode === 'select' && !selectionDone"
          class="cursor-crosshair absolute inset-0 z-10 pointer-events-auto"
          @mousedown.stop.prevent="startDraw"
          @mousemove.stop.prevent="draw"
          @mouseup.stop.prevent="endDraw"
          @touchstart.stop.prevent="startDraw"
          @touchmove.stop.prevent="draw"
          @touchend.stop.prevent="endDraw"
        />
      </div>

      <div class="flex justify-center space-x-2 mb-4 mt-4">
        <el-button :type="mode === 'move' ? 'primary' : 'default'" @click="mode = 'move'">
          🖐️ 移動圖片
        </el-button>
        <el-button :type="mode === 'select' ? 'primary' : 'default'" @click="mode = 'select'">
          🔲 擷取區塊
        </el-button>
      </div>
      <div v-if="selectionDone" class="mt-4">
        <div class="mb-4">
          <span class="mr-2">語系：</span>

          <el-select
            v-model="langs"
            filterable
            multiple
            collapse-tags
            placeholder="不選預設為英文"
            class="w-full sm:w-[200px]"
          >
            <el-option
              v-for="item in langOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
        <el-button type="success" @click="runOCR"> 辨識文字 </el-button>
        <el-button type="warning" class="ml-2" @click="resetSelection"> 重新選取 </el-button>
      </div>

      <p v-if="ocrWaitText" class="mt-4">{{ ocrWaitText }}</p>

      <div v-if="ocrSuccess" class="mt-4">
        <span class="mr-2">OCR 結果：</span>

        <el-input v-model="ocrText" placeholder="請輸入名稱" class="w-full sm:w-[300px]">
          <template #append>
            <div class="flex">
              <el-button class="p-2" @click="removeSpaces"> 去除空格 </el-button>
            </div>
          </template>
        </el-input>

        <div class="mt-4">
          <el-button type="primary" @click="setOCRText"> 確認 OCR 結果 </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.el-dialog__body {
  padding: 0;
}
.cursor-crosshair {
  touch-action: none;
}
</style>
