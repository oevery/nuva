import type { LoginResult } from '#shared/api/auth'
import type { ApiResponse } from '#shared/api/types'
import * as v from 'valibot'
import { createDemoToken, demoUser, setAuthCookie, validateDemoCredentials } from '#server/utils/auth'
import { ok } from '#server/utils/response'
import { loginFormSchema } from '#shared/api/auth'

export default defineEventHandler(async (event): Promise<ApiResponse<LoginResult>> => {
  const body = await readBody(event)
  const result = v.safeParse(loginFormSchema, body, {
    abortPipeEarly: true,
  })

  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      message: result.issues[0]?.message || '参数校验失败',
    })
  }

  if (!validateDemoCredentials(result.output.username, result.output.password)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: '用户名或密码错误',
    })
  }

  const token = createDemoToken()

  setAuthCookie(event, token)

  return ok({
    token,
    user: demoUser,
  }, '登录成功')
})
