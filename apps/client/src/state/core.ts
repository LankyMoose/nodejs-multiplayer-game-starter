import { resetAuthState, updateAuthState } from "./auth"
import { resetGameState } from "./game"
import { waitForServerOK } from "./server-status"

let isInitializing = false
export async function init() {
  if (isInitializing) return
  isInitializing = true
  await waitForServerOK()
  await updateAuthState()
  isInitializing = false
}

export function onDisconnected() {
  if (isInitializing) return
  resetAuthState()
  resetGameState()
  init()
}
