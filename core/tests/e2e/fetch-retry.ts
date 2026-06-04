import { fetch } from '@nuxt/test-utils/e2e'

export async function fetchWithRetry(path: string, init?: RequestInit) {
  let lastError: unknown

  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      return await fetch(path, init)
    }
    catch (error) {
      lastError = error
      await new Promise(resolve => setTimeout(resolve, 250))
    }
  }

  throw lastError
}

export async function fetchJsonWithRetry<T = any>(path: string, init?: RequestInit) {
  const response = await fetchWithRetry(path, init)
  return response.json() as Promise<T>
}
