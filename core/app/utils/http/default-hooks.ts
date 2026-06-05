import type { Method } from 'alova'
import type { NuvaPublicConfig } from '../../../config'
import { navigateTo, useCookie, useRequestHeaders } from 'nuxt/app'
import { useAuth } from '../../../modules/auth/runtime/composables/useAuth'
import { isSameOriginURL, resolveNuxtBaseURL } from './config'
import { handleHttpResponse } from './response'
import { applyAuthHeader, resolveTokenValue } from './token'

export interface HttpErrorNotifyPayload {
  error: unknown
  message: string
  status?: number
  method?: Method
}

export interface DefaultHttpRequestHooksOptions {
  notify?: (payload: HttpErrorNotifyPayload) => void | Promise<void>
}

const defaultErrorMessages = {
  401: '登录已过期，请重新登录',
  403: '无权限执行该操作',
  default: '请求失败，请稍后重试',
}

export function getHttpErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') {
    return
  }

  return (error as { statusCode?: number, status?: number }).statusCode || (error as { status?: number }).status
}

function getObjectValue(value: unknown, key: string): unknown {
  return value && typeof value === 'object' && key in value ? (value as Record<string, unknown>)[key] : undefined
}

function getStringValue(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)
}

export function resolveHttpErrorMessage(error: unknown, method?: Method) {
  const status = getHttpErrorStatus(error)
  const errorData = getObjectValue(error, 'data')
  const envelopeData = getObjectValue(errorData, 'data')
  const message = getStringValue(
    method?.meta?.errorMessage,
    getObjectValue(error, 'message'),
    getObjectValue(errorData, 'message'),
    getObjectValue(envelopeData, 'message'),
    getObjectValue(error, 'statusMessage'),
  )

  return message || (status === 401 ? defaultErrorMessages[401] : status === 403 ? defaultErrorMessages[403] : defaultErrorMessages.default)
}

async function notifyHttpError(error: unknown, method: Method | undefined, options: DefaultHttpRequestHooksOptions) {
  if (method?.meta?.errorSilent) {
    return
  }

  const payload = {
    error,
    message: resolveHttpErrorMessage(error, method),
    status: getHttpErrorStatus(error),
    method,
  }

  if (options.notify) {
    await options.notify(payload)
    return
  }

  if (import.meta.dev) {
    console.warn(`[nuva/http] ${payload.message}`, error)
  }
}

export async function handleAuthHttpError(error: unknown, config: NuvaPublicConfig, method?: Method, options: DefaultHttpRequestHooksOptions = {}) {
  const status = getHttpErrorStatus(error)

  if (status === 401 && method?.meta?.unauthorizedBehavior === 'throw') {
    throw error
  }

  if (config.auth.enabled && status === 401) {
    const auth = useAuth()
    await auth.logout()
    await auth.toLogin()

    throw error
  }

  if (status === 403) {
    const behavior = config.auth.enabled ? method?.meta?.forbiddenBehavior || 'notify' : 'notify'

    if (behavior === 'redirect') {
      await navigateTo(config.auth.permission.forbiddenPath)
      throw error
    }

    if (behavior === 'notify') {
      await notifyHttpError(error, method, options)
    }

    throw error
  }

  await notifyHttpError(error, method, options)

  throw error
}

export function useDefaultHttpRequestHooks(config: NuvaPublicConfig, options: DefaultHttpRequestHooksOptions = {}) {
  const { api: apiConfig, auth: authConfig } = config
  const cookieToken = useCookie<string | null>(authConfig.token.cookieName)
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const canForwardCookie = import.meta.server && isSameOriginURL(resolveNuxtBaseURL(apiConfig.baseURL))

  return {
    beforeRequest(method: Method) {
      if (canForwardCookie && requestHeaders?.cookie) {
        method.config.headers = {
          ...(method.config.headers || {}),
          cookie: requestHeaders.cookie,
        }
      }

      applyAuthHeader(
        method,
        resolveTokenValue(cookieToken.value, authConfig.token),
        authConfig.token,
      )
    },
    async onSuccess(response: Response, method: Method) {
      try {
        return await handleHttpResponse(response, method, apiConfig)
      }
      catch (error) {
        await handleAuthHttpError(error, config, method, options)
      }
    },
    async onError(error: unknown, method?: Method) {
      await handleAuthHttpError(error, config, method, options)
    },
    onComplete() {},
  }
}
