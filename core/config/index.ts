export interface NuvaAuthTokenConfig {
  /**
   * SSR 和客户端请求中用于读取 token 的 cookie 名称。
   * @default `token`
   */
  cookieName: string
  /**
   * 客户端用于读取 token 的 localStorage 键名。
   * @default `token`
   */
  storageKey: string
  /**
   * 发送 token 时使用的请求头名称。
   * @default `Authorization`
   */
  header: string
  /**
   * token 前缀；后端需要原始 token 时传空字符串。
   * @default `Bearer`
   */
  prefix: string
}

export interface NuvaApiConfig {
  /**
   * API 基础地址；SSR 时相对地址会基于当前请求 origin 解析。
   * @default `/api`
   */
  baseURL: string
  /**
   * 是否将 `{ code, message, data }` 这类通用响应包裹层自动解包为 `data`。
   * @default `true`
   */
  envelopeUnwrap: boolean
  /**
   * 业务成功码，使用英文逗号分隔，例如 `0`、`200` 或 `0,200,SUCCESS`。
   * @default `0`
   */
  successCodes: string
}

export type NuvaAuthModuleMode = 'frontend' | 'fullstack'

export interface NuvaAuthConfig {
  /** 是否启用 Nuva auth 模块能力。 */
  enabled: boolean
  /** auth 模式：frontend 只提供前端状态/路由能力，fullstack 额外接入 Better Auth。 */
  mode: NuvaAuthModuleMode
  /** 登录页路径，未登录访问受保护页面时会跳转到此路径。 */
  loginPath: string
  /** 登录成功后的默认回跳路径。 */
  homePath: string
  /** 登录跳转时保存来源地址的 query 参数名。 */
  redirectQuery: string
  /** 是否默认保护所有页面；页面可通过 `definePageMeta({ auth: false })` 跳过。 */
  global: boolean
  /** 全局保护时跳过的公开页面路径。 */
  publicRoutes: string[]
  /** token 存储和请求注入配置；单个 method 可通过 `meta.ignoreToken` 跳过。 */
  token: NuvaAuthTokenConfig
  /** Better Auth 全栈模式配置。 */
  betterAuth: {
    basePath: string
    serverAuthImport: string
  }
}

export interface NuvaAuthModuleOptions extends Partial<Omit<NuvaAuthConfig, 'enabled' | 'token' | 'betterAuth'>> {
  betterAuth?: Partial<NuvaAuthConfig['betterAuth']>
}

export interface NuvaPublicConfig {
  /** Nuva API 请求配置。 */
  api: NuvaApiConfig
  /** Nuva 登录态和跳转配置。 */
  auth: NuvaAuthConfig
}

export const defaultNuvaApiConfig = {
  baseURL: '/api',
  envelopeUnwrap: true,
  successCodes: '0',
} satisfies NuvaApiConfig

export const defaultNuvaAuthConfig = {
  enabled: false,
  mode: 'frontend',
  loginPath: '/login',
  homePath: '/',
  redirectQuery: 'redirect',
  global: false,
  publicRoutes: ['/login'],
  token: {
    cookieName: 'token',
    storageKey: 'token',
    header: 'Authorization',
    prefix: 'Bearer',
  },
  betterAuth: {
    basePath: '/api/auth',
    serverAuthImport: '~~/server/utils/better-auth',
  },
} satisfies NuvaAuthConfig

export const defaultNuvaPublicConfig = {
  api: defaultNuvaApiConfig,
  auth: defaultNuvaAuthConfig,
} satisfies NuvaPublicConfig
