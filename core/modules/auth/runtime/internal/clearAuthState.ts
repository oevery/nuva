import { useAccessMenuState } from './useAccessMenuState'
import { usePermissionState } from './usePermissionState'

interface ClearNuvaAuthStateOptions {
  permissionState?: ReturnType<typeof usePermissionState>
  accessMenuState?: ReturnType<typeof useAccessMenuState>
}

export function clearNuvaPermissionState(permissionState = usePermissionState()) {
  permissionState.value.permission = null
  permissionState.value.loadedAt = 0
}

export function clearNuvaAccessMenuState(accessMenuState = useAccessMenuState()) {
  accessMenuState.value.menus = []
  accessMenuState.value.loadedAt = 0
}

export function clearNuvaAuthDerivedState(options: ClearNuvaAuthStateOptions = {}) {
  clearNuvaPermissionState(options.permissionState)
  clearNuvaAccessMenuState(options.accessMenuState)
}
