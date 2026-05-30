import type { Method } from 'alova'
import type { HttpResponseType } from '../../types/alova'

export function inferResponseType(response: Response): HttpResponseType {
  const contentType = response.headers.get('content-type') || ''
  const contentDisposition = response.headers.get('content-disposition') || ''

  if (contentDisposition.includes('attachment')) {
    return 'blob'
  }

  if (contentType.includes('application/json')) {
    return 'json'
  }

  if (contentType.startsWith('text/')) {
    return 'text'
  }

  if (
    contentType.includes('application/octet-stream')
    || contentType.includes('application/pdf')
    || contentType.includes('application/vnd')
    || contentType.includes('image/')
    || contentType.includes('audio/')
    || contentType.includes('video/')
  ) {
    return 'blob'
  }

  return 'json'
}

export function resolveResponseType(response: Response, method: Method): HttpResponseType {
  return method.meta?.responseType || inferResponseType(response)
}
