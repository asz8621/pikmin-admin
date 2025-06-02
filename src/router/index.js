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
        meta: { auth: true },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/UsersView.vue'),
        meta: { auth: true },
      },
      {
        path: 'locations',
        name: 'Locations',
        component: () => import('@/views/LocationsView.vue'),
        meta: { auth: true },
      },
      {
        path: 'postcard-type',
        name: 'PostcardType',
        component: () => import('@/views/PostcardTypeView.vue'),
        meta: { auth: true },
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
    const data = res.data
    return data
  } catch (error) {
    const defaultMessage = '發生未知錯誤，請稍後再試'
    const message = error.response?.data?.message || error.message || defaultMessage
    showMessage('error', `錯誤: ${message}`)
  }
}

router.beforeEach(async (to, from, next) => {
  const token = Cookies.get('adminToken')
  const userStore = useUserStore()
  const { setUserData, isCheckUser } = userStore
  const { isCheck } = storeToRefs(userStore)

  if (to.meta.auth && !token) return next('/login')

  if (to.meta.auth && token && !isCheck.value) {
    const data = await checkUser()
    setUserData(data)
    isCheckUser()
  }

  next()
})

export default router
