import { computed, signal } from "kiru"
import { createAuthClient } from "better-auth/client"
import type { Session, User } from "better-auth"
import { withMinDuration } from "../utils"

window.__kiru.on("mount", (ctx) => ctx.name === "client" && updateAuthState())

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL,
})

type GetSessionError = {
  message?: string | undefined
  status: number
  statusText: string
}
interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: GetSessionError | null
}
export const authState = signal<AuthState>({
  user: null,
  session: null,
  isLoading: true,
  error: null,
})

export const isAuthenticated = computed(
  () => !!authState.value.session && !!authState.value.user
)
export const isAuthLoading = computed(() => authState.value.isLoading)
export const authError = computed(() => authState.value.error)
export const user = computed(() => authState.value.user)

export async function updateAuthState() {
  authState.value = { ...authState.value, isLoading: true }
  const { error, data } = await withMinDuration(500, () =>
    authClient.getSession()
  )

  const nextState: AuthState = {
    user: null,
    session: null,
    isLoading: false,
    error: null,
  }

  if (error) {
    nextState.error = error
  } else if (data) {
    const { user, session } = data
    nextState.user = user
    nextState.session = session
  }

  authState.value = nextState
}

export async function signOut() {
  await withMinDuration(500, () => authClient.signOut())
  await updateAuthState()
}
