import type { NuvaAccessMenuItem } from '@oevery/nuva/config'
import type { ApiResponse } from '#shared/api/types'
import { requireAuth } from '#server/utils/auth'
import { ok } from '#server/utils/response'

const menus: NuvaAccessMenuItem[] = [
  {
    id: 'home',
    title: '首页',
    path: '/',
    icon: 'i-lucide-house',
    order: 1,
  },
  {
    id: 'profile',
    title: '资料管理',
    path: '/profile',
    icon: 'i-lucide-user',
    order: 2,
    permissions: ['profile:read'],
  },
]

export default defineEventHandler((event): ApiResponse<NuvaAccessMenuItem[]> => {
  requireAuth(event)

  return ok(menus)
})
