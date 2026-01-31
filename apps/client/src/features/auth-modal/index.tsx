import { computed, Derive, signal, StyleObject, useState } from "kiru"
import { validateDisplayName } from "shared"
import { auth } from "@/state/auth"

type FormMode = "signin" | "signup"

const email = signal("")
const password = signal("")
const displayName = signal("")
const submitError = signal<string | null>(null)
const isSubmitting = signal(false)

async function handleSubmit(e: Event, mode: FormMode) {
  e.preventDefault()
  submitError.value = null
  isSubmitting.value = true

  if (mode === "signup") {
    const displayNameError = validateDisplayName(displayName.value.trim())
    if (displayNameError) {
      submitError.value = displayNameError
      return
    }
    const { error } = await auth.client.signUp.email({
      email: email.value,
      password: password.value,
      name: displayName.value.trim() || "User",
      callbackURL: "/",
    })
    if (error) {
      const msg = (error as { message?: string }).message
      submitError.value = msg ? String(msg) : "Sign up failed"
      return
    }
  } else {
    const { error } = await auth.client.signIn.email({
      email: email.value,
      password: password.value,
      callbackURL: "/",
    })
    if (error) {
      const msg = (error as { message?: string }).message
      submitError.value = msg ? String(msg) : "Sign in failed"
      return
    }
  }
}

const error = computed(() => submitError.value ?? auth.$error?.message ?? null)

function FormModeButton({
  active,
  onclick,
  children,
}: {
  active: boolean
  onclick: () => void
  children: JSX.Children
}) {
  return (
    <button
      type="button"
      onclick={onclick}
      className={
        "flex-1 rounded-md py-2 text-sm font-medium transition " +
        (active
          ? "bg-gray-700 text-white"
          : "text-gray-400 hover:text-gray-200")
      }
    >
      {children}
    </button>
  )
}

const formStyles = computed<StyleObject>(() => {
  return {
    opacity: isSubmitting.value ? 0.5 : 1,
    transition: "0.2s ease-in-out",
  }
})

export function AuthModal() {
  const [mode, setMode] = useState<FormMode>("signin")

  return (
    <div
      style={formStyles}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-700/80 bg-gray-900/95 p-6 shadow-xl shadow-purple-950/20">
        <div className="mb-6 flex gap-2 rounded-lg bg-gray-800/80 p-1">
          <FormModeButton
            active={mode === "signin"}
            onclick={() => setMode("signin")}
          >
            Sign in
          </FormModeButton>
          <FormModeButton
            active={mode === "signup"}
            onclick={() => setMode("signup")}
          >
            Sign up
          </FormModeButton>
        </div>

        <form
          onsubmit={(e) => handleSubmit(e, mode)}
          className="flex flex-col gap-4"
        >
          {mode === "signup" && (
            <div>
              <label
                htmlFor="auth-display-name"
                className="mb-1 block text-sm font-medium text-gray-300"
              >
                Display Name
              </label>
              <input
                id="auth-display-name"
                type="text"
                autocomplete="display-name"
                bind:value={displayName}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Display Name"
                required
                disabled={isSubmitting}
              />
            </div>
          )}
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autocomplete="email"
              required
              bind:value={email}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="mb-1 block text-sm font-medium text-gray-300"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autocomplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
              minLength={8}
              bind:value={password}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder={mode === "signup" ? "Min 8 characters" : "••••••••"}
              disabled={isSubmitting}
            />
          </div>

          <Derive from={error}>
            {(error) =>
              error && (
                <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )
            }
          </Derive>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600"
          >
            {isSubmitting.value
              ? "Please wait…"
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>
      </div>
    </div>
  )
}
