import type { NuvaMenuResolver } from '@oevery/nuva/config'

const menuResolver: NuvaMenuResolver = async ({ requestWith }) => {
  return requestWith()
}

export default menuResolver
