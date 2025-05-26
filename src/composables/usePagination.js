import { ref, watch } from 'vue'
import { showMessage } from '@/utils/message'

export function usePagination(fetchDataFn, externalSearchParams = null) {
  const page = ref(1)
  const limit = ref(10)
  const totalCount = ref(0)
  const tableData = ref([])
  const isLoading = ref(false)

  const onError = ref(null)

  const fetchData = async () => {
    if (isLoading.value) return
    if (page.value <= 0 || limit.value <= 0) {
      showMessage('error', 'page 或 limit 錯誤')
      return
    }

    isLoading.value = true

    try {
      const response = await fetchDataFn({
        page: page.value,
        limit: limit.value,
        ...(externalSearchParams ? externalSearchParams : {}),
      })
      tableData.value = response.data
      totalCount.value = response.total
    } catch (error) {
      if (onError.value) {
        onError.value(error)
      } else {
        showMessage('error', error.message || '發生錯誤')
      }
    } finally {
      isLoading.value = false
    }
  }

  const getData = async () => {
    await fetchData()
  }

  const refresh = async () => {
    await getData()
  }

  const submitSearch = async () => {
    page.value = 1 // 搜尋強制轉跳第一頁
    await getData()
  }

  // 監聽 page / limit 變動就載入
  watch([page, limit], getData)

  return {
    page,
    limit,
    totalCount,
    isLoading,
    tableData,
    getData,
    refresh,
    submitSearch,
    onError,
  }
}
