<script setup lang="ts">
type SnippetId = 'config' | 'page' | 'button' | 'button-sync' | 'server' | 'server-guard'

interface Snippet {
  id: SnippetId
  label: string
  code: string
}

interface Demo {
  id: string
  label: string
  title: string
  description: string
  points: string[]
  snippets: Snippet[]
}

function getSnippetLanguage(snippet: Snippet) {
  return snippet.code.trimStart().startsWith('<') ? 'vue' : 'ts'
}

const demos: Demo[] = [
  {
    id: 'profile',
    label: 'Token + getInfo',
    title: 'Token + 用户信息接口',
    description: '国内后台最常见：登录拿 token，用户信息接口一次返回角色、按钮权限、作用域和数据权限。',
    points: ['推荐优先选择', '接口形态接近 /getInfo', '适合菜单和按钮权限一起下发'],
    snippets: [
      {
        id: 'config',
        label: 'nuva.config.ts',
        code: `export default defineNuvaConfig({
  auth: {
    provider: 'token',
    global: true,
    permission: {
      source: 'remote',
      remote: {
        profile: {
          url: '/auth/getInfo',
          method: 'GET',
        },
      },
    },
  },
})`,
      },
      {
        id: 'page',
        label: 'nuxt.config.ts',
        code: `export default defineNuxtConfig({
  modules: ['@oevery/nuva/auth'],
})`,
      },
      {
        id: 'button',
        label: '页面权限',
        code: `definePageMeta({
  auth: {
    permissions: ['profile:read'],
  },
})`,
      },
      {
        id: 'server',
        label: '按钮权限',
        code: `<NuvaCan permission="profile:update">
  <UButton>保存</UButton>
</NuvaCan>`,
      },
      {
        id: 'server-guard',
        label: '服务端鉴权',
        code: `export default defineNuvaPermissionHandler({
  permission: 'profile:update',
}, (event, auth) => {
  return updateProfile(event, auth)
})`,
      },
    ],
  },
  {
    id: 'endpoint',
    label: '独立权限接口',
    title: 'Token + 权限接口',
    description: '用户信息和权限接口分离，适合权限需要高频刷新或权限服务独立维护的系统。',
    points: ['登录态仍用 token', '权限只从 remote.permission 读取', '适合独立权限中心'],
    snippets: [
      {
        id: 'config',
        label: 'nuva.config.ts',
        code: `export default defineNuvaConfig({
  auth: {
    provider: 'token',
    permission: {
      source: 'remote',
      remote: {
        permission: {
          url: '/auth/permissions',
        },
      },
    },
  },
})`,
      },
      {
        id: 'page',
        label: '页面权限',
        code: `definePageMeta({
  auth: {
    roles: ['admin'],
    permissions: ['system:user:list'],
    permissionMode: 'all',
  },
})`,
      },
      {
        id: 'button',
        label: '按钮权限',
        code: `const permission = usePermission()

const canCreateUser = computed(() => {
  return permission.can('system:user:create')
})`,
      },
      {
        id: 'server',
        label: '服务端鉴权',
        code: `export default defineNuvaProtectedHandler({
  roles: ['admin', 'manager'],
  roleMode: 'any',
  permissions: ['system:user:create'],
}, (event, auth) => {
  return createUser(event, auth)
})`,
      },
    ],
  },
  {
    id: 'local',
    label: 'Local',
    title: '本地静态权限',
    description: '适合 demo、静态原型和开发期菜单兜底，不建议作为生产 API 的真实授权来源。',
    points: ['不用请求权限接口', '适合快速验证页面', '服务端默认不会读取本地兜底'],
    snippets: [
      {
        id: 'config',
        label: 'nuxt.config.ts',
        code: `export default defineNuxtConfig({
  nuvaAuth: {
    provider: 'token',
    permission: {
      source: 'local',
      local: {
        roles: ['admin'],
        permissions: ['profile:read', 'profile:update'],
      },
    },
  },
})`,
      },
      {
        id: 'page',
        label: '页面权限',
        code: `definePageMeta({
  auth: true,
})`,
      },
      {
        id: 'button',
        label: '按钮权限',
        code: `<NuvaCan role="admin" permission="profile:update">
  <UButton>编辑资料</UButton>
</NuvaCan>`,
      },
      {
        id: 'server',
        label: '服务端鉴权',
        code: `export default definePermissionHandler({
  auth: requireDemoAuth,
  permission: 'profile:update',
}, (event, auth) => {
  return updateProfile(event, auth)
})`,
      },
    ],
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    title: '本地兜底 + 远程刷新',
    description: '本地权限先让基础菜单可用，远程接口刷新真实权限，适合首屏体验和开发兜底。',
    points: ['本地权限只做兜底', '远程权限作为真实授权', '适合需要平滑首屏的后台'],
    snippets: [
      {
        id: 'config',
        label: 'nuva.config.ts',
        code: `export default defineNuvaConfig({
  auth: {
    provider: 'token',
    permission: {
      source: 'hybrid',
      local: {
        permissions: ['dashboard:read'],
      },
      remote: {
        profile: {
          url: '/auth/getInfo',
        },
      },
    },
  },
})`,
      },
      {
        id: 'page',
        label: '页面权限',
        code: `definePageMeta({
  auth: {
    permissions: ['dashboard:read'],
  },
})`,
      },
      {
        id: 'button',
        label: '按钮权限',
        code: `const permission = usePermission()

await permission.ensure()
permission.can('dashboard:export')`,
      },
      {
        id: 'server',
        label: '服务端鉴权',
        code: `export default defineNuvaPermissionHandler({
  permission: 'dashboard:export',
}, (event, auth) => {
  return exportDashboard(event, auth)
})`,
      },
    ],
  },
  {
    id: 'better-auth',
    label: 'Better Auth',
    title: 'Better Auth session + 动态权限',
    description: '让 Better Auth 负责认证协议和 organization.hasPermission，Nuva 负责路由、UI 和统一权限入口。',
    points: ['作为独立 provider 使用', '不和 token 模式混配', '权限点使用 resource:action'],
    snippets: [
      {
        id: 'config',
        label: 'nuva.config.ts',
        code: `export default defineNuvaConfig({
  auth: {
    provider: 'better-auth',
    betterAuth: {
      serverAuthImport: '~~/server/utils/better-auth',
      organization: {
        hasPermission: true,
      },
    },
  },
})`,
      },
      {
        id: 'page',
        label: '页面权限',
        code: `definePageMeta({
  auth: {
    permissions: ['project:create'],
  },
})`,
      },
      {
        id: 'button',
        label: '按钮权限',
        code: `<NuvaCan permission="project:create">
  <UButton>新建项目</UButton>
</NuvaCan>`,
      },
      {
        id: 'button-sync',
        label: '高密度列表',
        code: `<NuvaCan resolve="sync" permission="project:create">
  <UButton>只做本地静态判断</UButton>
</NuvaCan>`,
      },
      {
        id: 'server',
        label: '服务端鉴权',
        code: `const auth = useBetterAuthClient()
const session = await auth.api.getSession({ headers })

// 服务端仍按 Better Auth 插件校验动态权限`,
      },
    ],
  },
]
</script>

<template>
  <div class="my-8 space-y-6">
    <div class="rounded-2xl border border-default bg-elevated/30 p-5">
      <p class="text-sm font-semibold text-highlighted">
        常见权限接入方式
      </p>
      <p class="max-w-3xl text-sm leading-6 text-toned">
        按场景直接复制最小配置。多数后台从 Token + getInfo 开始，复杂场景再切到独立权限接口、Hybrid 或 Better Auth。
      </p>
    </div>

    <section
      v-for="demo in demos"
      :key="demo.id"
      class="rounded-2xl border border-default bg-default/70 p-5"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p class="text-xs font-semibold text-primary">
            {{ demo.label }}
          </p>
          <h3 class="mt-1 text-lg font-semibold text-highlighted">
            {{ demo.title }}
          </h3>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-toned">
            {{ demo.description }}
          </p>
        </div>
      </div>

      <ul class="mt-4 grid gap-2 text-sm text-default md:grid-cols-3">
        <li
          v-for="point in demo.points"
          :key="point"
          class="rounded-xl border border-default bg-elevated/60 px-3 py-2"
        >
          {{ point }}
        </li>
      </ul>

      <div class="mt-5 grid gap-4 xl:grid-cols-2">
        <div
          v-for="snippet in demo.snippets"
          :key="snippet.id"
          class="min-w-0"
        >
          <CodePreview
            :code="snippet.code"
            :language="getSnippetLanguage(snippet)"
            :title="snippet.label"
            :cache-key="`permission-${demo.id}-${snippet.id}`"
          />
        </div>
      </div>
    </section>
  </div>
</template>
