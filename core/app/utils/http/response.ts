import type { Method } from 'alova'
import type { HttpResponseType } from '../../types/alova'
import type { NuvaApiConfig } from '../../types/config'
import { normalizeSuccessCodes } from './config'
import { resolveResponseType } from './response-type'

interface ApiEnvelope<T = unknown> {
  code: number | string
  message?: string
  data: T
}

function isApiEnvelope(data: unknown): data is ApiEnvelope {
  return typeof data === 'object' && data !== null && 'code' in data && 'data' in data
}

function isSuccessCode(code: number | string, successCodes: Array<number | string>) {
  return successCodes.some(successCode => String(successCode) === String(code))
}

async function parseResponseBody(response: Response, responseType: HttpResponseType) {
  if (responseType === 'raw') {
    return response
  }

  if (response.status === 204) {
    return null
  }

  if (responseType === 'json') {
    return response.json()
  }

  if (responseType === 'blob') {
    return response.blob()
  }

  if (responseType === 'arrayBuffer') {
    return response.arrayBuffer()
  }

  return response.text()
}

export async function handleHttpResponse(response: Response, method: Method, config: NuvaApiConfig) {
  const responseType = resolveResponseType(response, method)
  const data = await parseResponseBody(response, responseType)
  const successCodes = normalizeSuccessCodes(method.meta?.successCodes || config.successCodes)
  const envelopeUnwrap = method.meta?.envelopeUnwrap ?? config.envelopeUnwrap

  if (responseType === 'raw') {
    return data
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: response.statusText || 'Request failed',
      data,
    })
  }

  if (responseType === 'json' && envelopeUnwrap && isApiEnvelope(data)) {
    if (!isSuccessCode(data.code, successCodes)) {
      throw createError({
        statusCode: 200,
        statusMessage: data.message || 'Business request failed',
        data,
      })
    }

    return data.data
  }

  return data
}
