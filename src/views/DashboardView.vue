<script setup>
import { onMounted, ref } from 'vue'
import axios from '@/plugins/axios'
import dayjs from 'dayjs'
import { useTransition } from '@vueuse/core'
import { showMessage } from '@/utils/message'

const infoData = ref({})
const userTotal = ref(0)
const postcardTypesTotal = ref(0)
const locationsTotal = ref(0)
const approvedTotal = ref(0)
const pendingTotal = ref(0)
const rejectedTotal = ref(0)
const abnormalTotal = ref(0)

const stats = ref([
  {
    key: 'total_users',
    title: '使用者總數',
    class: '',
    transition: useTransition(userTotal, {
      duration: 1000,
    }),
  },
  {
    key: 'total_postcard_types',
    title: '明信片類型',
    class: '',
    transition: useTransition(postcardTypesTotal, {
      duration: 1000,
    }),
  },
  {
    key: 'total_locations',
    title: '地圖位置總數',
    class: '',
    transition: useTransition(locationsTotal, {
      duration: 1000,
    }),
  },
])

const statusStats = ref([
  {
    key: 'approved',
    title: '完成',
    class: 'green',
    transition: useTransition(approvedTotal, {
      duration: 1000,
    }),
  },
  {
    key: 'pending',
    title: '審核中',
    class: 'yellow',
    transition: useTransition(pendingTotal, {
      duration: 1000,
    }),
  },
  {
    key: 'rejected',
    title: '已駁回',
    class: 'red',
    transition: useTransition(rejectedTotal, {
      duration: 1000,
    }),
  },
  {
    key: 'abnormal',
    title: '異常',
    class: 'pink',
    transition: useTransition(abnormalTotal, {
      duration: 1000,
    }),
  },
])

const formatTime = (datetime) => {
  return dayjs(datetime).format('YYYY-MM-DD HH:mm:ss')
}

const getDashboard = async () => {
  try {
    const res = await axios.get('/admin/dashboard')
    infoData.value = res.data
    const {
      total_users,
      total_postcard_types,
      total_locations,
      approved,
      pending,
      rejected,
      abnormal,
    } = res.data
    userTotal.value = total_users
    postcardTypesTotal.value = total_postcard_types
    locationsTotal.value = total_locations
    approvedTotal.value = approved
    pendingTotal.value = pending
    rejectedTotal.value = rejected
    abnormalTotal.value = abnormal
  } catch (error) {
    const defaultMessage = '發生未知錯誤，請稍後再試'
    const message = error.response?.data?.message || error.message || defaultMessage
    showMessage('error', `錯誤: ${message}`)
  }
}

onMounted(() => {
  getDashboard()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-bold">控制台總覽</h1>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <el-card v-for="item in stats" :key="item.key" class="text-center">
        <el-statistic
          class="cardItem"
          :class="item.class"
          :title="item.title"
          :value="item.transition"
          :formatter="(val) => Number(val).toFixed(0).toLocaleString()"
        />
      </el-card>
    </div>

    <el-card>
      <template #header>
        <div class="font-semibold">位置審核狀態</div>
      </template>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div v-for="item in statusStats" :key="item.key">
          <el-statistic
            class="cardItem"
            :class="item.class"
            :title="item.title"
            :value="item.transition"
            :formatter="(val) => Number(val).toFixed(0).toLocaleString()"
          />
        </div>
      </div>
    </el-card>

    <el-card>
      <template #header>
        <div class="font-semibold">最近活動</div>
      </template>

      <el-empty
        v-if="!infoData.recent_activities || infoData.recent_activities.length === 0"
        description="尚無活動"
      />

      <el-timeline v-else>
        <el-timeline-item
          v-for="(item, index) in infoData.recent_activities"
          :key="index"
          :timestamp="formatTime(item.approved_at)"
          placement="top"
        >
          {{ `位置「${item.name || item.id}」已審核通過` }}
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<style lang="scss">
.cardItem {
  .el-statistic__head {
    @apply text-gray-500 text-sm;
  }

  .el-statistic__content {
    @apply text-2xl font-bold;
  }
  &.yellow {
    .el-statistic__content {
      @apply text-yellow-500;
    }
  }
  &.red {
    .el-statistic__content {
      @apply text-red-500;
    }
  }
  &.green {
    .el-statistic__content {
      @apply text-green-500;
    }
  }
  &.pink {
    .el-statistic__content {
      @apply text-pink-500;
    }
  }
}
</style>
