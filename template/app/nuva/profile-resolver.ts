import type { NuvaProfileResolver } from '@oevery/nuva/config'
import type { CurrentUser } from '#shared/api/auth'

const profileResolver: NuvaProfileResolver<CurrentUser> = async ({ requestWith }) => {
  return requestWith<CurrentUser>()
}

export default profileResolver
