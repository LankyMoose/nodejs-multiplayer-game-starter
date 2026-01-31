import { computed, signal } from "kiru"
import { createAuthClient } from "better-auth/client"
import type { Session, User } from "better-auth"
import { withMinDuration } from "@/utils"
import { env } from "@/env"

window.__kiru.on("mount", (ctx) => ctx.name === "client" && updateAuthState())

const protocol = import.meta.env.DEV ? "http" : "https"

const authClient = createAuthClient({
  baseURL: `${protocol}://${env.HOST}${env.PORT}/api/auth`,
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

const _authState = signal<AuthState>({
  user: null,
  session: null,
  isLoading: true,
  error: null,
})

const isAuthenticated = computed(
  () => !!_authState.value.session && !!_authState.value.user
)
const isLoading = computed(() => _authState.value.isLoading)
const error = computed(() => _authState.value.error)
const user = computed(() => _authState.value.user)

export const auth = {
  isAuthenticated,
  isLoading,
  error,
  user,
  update: updateAuthState,
  signOut: () =>
    authClient.signOut().finally(() => (window.location.href = "/")),
  client: authClient,
  _internal: _authState,
}

async function updateAuthState() {
  _authState.value = { ..._authState.value, isLoading: true }
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

  _authState.value = nextState
}
