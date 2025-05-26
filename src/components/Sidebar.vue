<script setup>
import { computed, watch } from 'vue'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { useSidebar } from '@/composables/useSidebar'
import { menuItems } from '@/config/menu'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const activeIndex = computed(() => {
  const matched = menuItems.find((item) => item.route === route.name)
  return matched?.index || '1'
})

const router = useRouter()
const { isPC, sidebarState, isMobileCollapse, toggleCollapse, closeMobileSidebar } = useSidebar()

const collapseMenu = () => {
  if (!isPC.value) {
    closeMobileSidebar() // 行動裝置：關閉側邊欄
  } else {
    toggleCollapse() // 桌機：切換展開/收合狀態
  }
}

const selectMenuItem = (index) => {
  const menuItem = menuItems.find((item) => item.index === index)
  if (!isPC.value) closeMobileSidebar()
  if (menuItem?.route) {
    router.push({ name: menuItem.route })
  }
}

watch(
  isPC,
  (n) => {
    if (n) closeMobileSidebar()
  },
  { immediate: true },
)
</script>

<template>
  <el-scrollbar
    view-class="h-screen"
    class="select-none"
    :class="[
      !isPC ? 'absolute top-0 -left-[250px] transition-all duration-300 ease-in-out z-50' : '',
      isMobileCollapse ? 'left-0' : '',
    ]"
  >
    <el-menu
      :default-active="activeIndex"
      class="el-menu-vertical-demo overflow-auto h-screen z-50"
      :collapse="sidebarState"
      @select="selectMenuItem"
    >
      <div class="flex items-center px-5 h-[56px]">
        <div
          :class="[
            'transition-all duration-300 overflow-hidden whitespace-nowrap',
            sidebarState ? 'basis-0 opacity-0' : 'flex-grow opacity-100',
          ]"
        >
          <h1 class="text-lg font-bold">Admin</h1>
        </div>

        <component
          class="w-6 h-6 cursor-pointer"
          :is="sidebarState ? PanelLeftOpen : PanelLeftClose"
          @click="collapseMenu"
        />
      </div>
      <template v-for="item in menuItems" :key="item.index">
        <el-menu-item :index="item.index">
          <el-icon class="menuIcon">
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </template>
    </el-menu>

    <!-- 遮罩層 -->
    <transition name="overlay-fade">
      <div
        v-if="isMobileCollapse"
        class="fixed inset-0 z-40"
        :style="{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }"
        @click="closeMobileSidebar"
      />
    </transition>
  </el-scrollbar>
</template>

<style lang="scss">
.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 250px;
}
.menuIcon {
  font-size: 24px !important;
  margin-right: 1rem !important;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition:
    background-color 0.3s ease,
    opacity 0.3s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  background-color: rgba(0, 0, 0, 0);
  opacity: 0;
}
</style>
