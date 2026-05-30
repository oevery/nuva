export interface NuvaApiTokenConfig {
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
  /** token 注入配置；单个 method 可通过 `meta.ignoreToken` 跳过。 */
  token: NuvaApiTokenConfig
}

export interface NuvaPublicConfig {
  /** Nuva API 请求配置。 */
  api: NuvaApiConfig
}

export const defaultNuvaApiConfig = {
  baseURL: '/api',
  envelopeUnwrap: true,
  successCodes: '0',
  token: {
    cookieName: 'token',
    storageKey: 'token',
    header: 'Authorization',
    prefix: 'Bearer',
  },
} satisfies NuvaApiConfig

export const defaultNuvaPublicConfig = {
  api: defaultNuvaApiConfig,
} satisfies NuvaPublicConfig
