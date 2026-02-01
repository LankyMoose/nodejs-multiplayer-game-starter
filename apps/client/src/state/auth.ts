import { signal } from "kiru"
import { createAuthClient } from "better-auth/client"
import type { Session, User } from "better-auth"
import { withMinDuration } from "@/utils"
import { env } from "@/env"
import { loaderText } from "./loader"

const authClient = createAuthClient({
  baseURL: `${env.HTTP_BASE_URL}/api/auth`,
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

export function resetAuthState() {
  user.value = null
  session.value = null
  isLoading.value = true
  error.value = null
}

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

export async function updateAuthState() {
  isLoading.value = true
  error.value = null
  session.value = null
  user.value = null
  loaderText.value = "Checking credentials..."

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
