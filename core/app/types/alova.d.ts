export type HttpResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw'
export type HttpSuccessCodes = string | number | Array<string | number>
export type HttpForbiddenBehavior = 'notify' | 'redirect' | 'silent' | 'throw'

declare module 'alova' {
  interface AlovaCustomTypes {
    meta: {
      /** 单个接口是否解包 `{ code, message, data }`；未设置时使用 `runtimeConfig.public.nuva.api.envelopeUnwrap`。 */
      envelopeUnwrap?: boolean
      /** 是否跳过 token 注入；适用于登录、公开接口、下载直链等不需要鉴权的请求。 */
      ignoreToken?: boolean
      /** 单个接口响应解析类型；未设置时按响应 headers 自动嗅探。 */
      responseType?: HttpResponseType
      /** 单个接口业务成功码；未设置时使用 `runtimeConfig.public.nuva.api.successCodes`。 */
      successCodes?: HttpSuccessCodes
      /** 当前接口返回 403 时的行为；默认提示错误，不跳转。 */
      forbiddenBehavior?: HttpForbiddenBehavior
      /** 当前接口错误提示文案；优先级高于后端错误信息。 */
      errorMessage?: string
      /** 是否静默请求错误提示；不影响错误继续抛出。 */
      errorSilent?: boolean
    }
  }
}
