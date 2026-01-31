import { signal } from "kiru"
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

const user = signal<User | null>(null)
const session = signal<Session | null>(null)
const isLoading = signal<boolean>(true)
const error = signal<GetSessionError | null>(null)

export const auth = {
  get $isLoading() {
    return isLoading.value
  },
  get $error() {
    return error.value
  },
  get $user() {
    return user.value
  },
  update: updateAuthState,
  signOut: () =>
    authClient.signOut().finally(() => (window.location.href = "/")),
  client: authClient,
  _signals: { user, session, isLoading, error },
}

async function updateAuthState() {
  isLoading.value = true
  const { error: authError, data: authData } = await withMinDuration(500, () =>
    authClient.getSession()
  )

  if (authError) {
    error.value = authError
    user.value = null
    session.value = null
  } else if (authData) {
    user.value = authData.user
    session.value = authData.session
    error.value = null
  }

  isLoading.value = false
}
