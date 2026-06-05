import { defineNuvaPermissionHandler } from '@oevery/nuva/server/utils/permission'

export default defineNuvaPermissionHandler({
  permission: 'project:create',
  roles: ['admin'],
}, (_event, auth, permission) => ({
  userId: (auth as { user?: { id?: string } }).user?.id,
  roles: permission.roles,
  scope: permission.scope,
}))
