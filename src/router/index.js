import { createRouter, createWebHistory } from 'vue-router'
import Cookies from 'js-cookie'
import axios from '@/plugins/axios'
import { storeToRefs } from 'pinia'
import { showMessage } from '@/utils/message'
import { useUserStore } from '@/stores/useUserStore'

const routes = [
  {
    path: '/login',
    component: () => import('@/layout/LoginLayout.vue'),
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('@/views/LoginView.vue'),
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/layout/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/UsersView.vue'),
      },
      {
        path: 'locations',
        name: 'Locations',
        component: () => import('@/views/LocationsView.vue'),
      },
      {
        path: 'postcard-type',
        name: 'PostcardType',
        component: () => import('@/views/PostcardTypeView.vue'),
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/ReportsView.vue'),
      },
      {
        path: 'test',
        name: 'Test',
        component: () => import('@/views/Test.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const checkUser = async () => {
  try {
    const res = await axios.get('/admin/check')
    return res.data ?? res
  } catch (error) {
    const defaultMessage = '發生未知錯誤，請稍後再試'
    const message = error.response?.data?.message || error.message || defaultMessage
    showMessage('error', `錯誤: ${message}`)
    return null
  }
}

router.beforeEach(async (to, from) => {
  const token = Cookies.get('adminToken')
  const requiresAuth = to.matched.some((route) => route.meta.requiresAuth)
  const userStore = useUserStore()
  const { setUserData, isCheckUser } = userStore
  const { isCheck } = storeToRefs(userStore)

  if (requiresAuth && !token) return '/login'

  if (requiresAuth && token && !isCheck.value) {
    const data = await checkUser()
    if (!data) {
      Cookies.remove('adminToken')
      return '/login'
    }

    setUserData(data)
    isCheckUser()
  }

  return true
})

export default router
