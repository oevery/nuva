import type { ProfileFormOutput } from '#shared/api/profile'
import type { ApiResponse } from '#shared/api/types'
import * as v from 'valibot'
import { ok } from '#server/utils/response'
import { profileFormSchema } from '#shared/api/profile'

interface ValidationIssue {
  field: string
  message: string
  type: string
}

function formatValidationIssues(issues: v.BaseIssue<unknown>[]): ValidationIssue[] {
  return issues.map(issue => ({
    field: issue.path?.map(item => String(item.key)).join('.') || '',
    message: issue.message,
    type: issue.type,
  }))
}

export default defineEventHandler(async (event): Promise<ApiResponse<ProfileFormOutput>> => {
  const body = await readBody(event)
  const result = v.safeParse(profileFormSchema, body, {
    abortPipeEarly: true,
  })

  if (!result.success) {
    const message = result.issues[0]?.message || '参数校验失败'

    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      message,
      data: formatValidationIssues(result.issues),
    })
  }

  return ok(result.output, '保存成功')
})
