import type { NuvaUserResolver } from '@oevery/nuva/config'
import type { CurrentUser } from '#shared/api/auth'

const userResolver: NuvaUserResolver<CurrentUser> = async ({ requestWith }) => {
  return requestWith<CurrentUser>()
}

export default userResolver
