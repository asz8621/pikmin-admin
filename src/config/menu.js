import { LayoutDashboard, Users, FolderKanban, MapPinned } from 'lucide-vue-next'

export const menuItems = [
  {
    index: '1',
    icon: LayoutDashboard,
    title: '儀錶板',
    route: 'Dashboard',
  },
  {
    index: '2',
    icon: Users,
    title: '會員管理',
    route: 'Users',
  },
  {
    index: '3',
    icon: FolderKanban,
    title: '明信片類型管理',
    route: 'PostcardType',
  },
  {
    index: '4',
    icon: MapPinned,
    title: '位置管理',
    route: 'Locations',
  },
]
