import type { LoginResult } from '#shared/api/auth'
import type { ApiResponse } from '#shared/api/types'
import * as v from 'valibot'
import { demoToken, demoUser, setAuthCookie } from '#server/utils/auth'
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

  setAuthCookie(event, demoToken)

  return ok({
    token: demoToken,
    user: demoUser,
  }, '登录成功')
})
