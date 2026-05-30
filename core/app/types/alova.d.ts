export type HttpResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer' | 'raw'
export type HttpSuccessCodes = string | number | Array<string | number>

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
    }
  }
}
