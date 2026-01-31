import { computed, Derive, signal, useState } from "kiru"
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
    })
    if (error) {
      const msg = (error as { message?: string }).message
      submitError.value = msg ? String(msg) : "Sign up failed"
      isSubmitting.value = false
      return
    }
  } else {
    const { error } = await auth.client.signIn.email({
      email: email.value,
      password: password.value,
    })
    if (error) {
      const msg = (error as { message?: string }).message
      submitError.value = msg ? String(msg) : "Sign in failed"
      isSubmitting.value = false
      return
    }
  }
  window.location.href = "/"
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
        "flex-1 py-2 text-sm font-medium transition " +
        (active
          ? "bg-[var(--game-accent)] text-white"
          : "text-[var(--game-text-dim)] hover:text-[var(--game-text)]")
      }
    >
      {children}
    </button>
  )
}

export function AuthModal() {
  const [mode, setMode] = useState<FormMode>("signin")

  return (
    <div
      style={{
        opacity: isSubmitting.value ? 0.5 : 1,
        transition: "0.2s ease-in-out",
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="game-panel relative w-full max-w-sm p-6">
        <h1 className="game-title text-xl tracking-wide text-[var(--game-text)] mb-6 text-center">
          3UP1DOWN
        </h1>
        <div className="mb-6 flex gap-1 bg-white/5 p-1 border border-[var(--game-surface-border)]">
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
                className="mb-1 block text-sm font-medium text-[var(--game-text)]"
              >
                Display Name
              </label>
              <input
                id="auth-display-name"
                type="text"
                autocomplete="display-name"
                bind:value={displayName}
                className="w-full border border-[var(--game-surface-border)] bg-white/5 px-3 py-2 text-[var(--game-text)] placeholder-[var(--game-text-dim)] focus:border-[var(--game-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--game-accent)]/30"
                placeholder="Display Name"
                required
                disabled={isSubmitting}
              />
            </div>
          )}
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-sm font-medium text-[var(--game-text)]"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autocomplete="email"
              required
              bind:value={email}
              className="w-full border border-[var(--game-surface-border)] bg-white/5 px-3 py-2 text-[var(--game-text)] placeholder-[var(--game-text-dim)] focus:border-[var(--game-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--game-accent)]/30"
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="mb-1 block text-sm font-medium text-[var(--game-text)]"
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
              className="w-full border border-[var(--game-surface-border)] bg-white/5 px-3 py-2 text-[var(--game-text)] placeholder-[var(--game-text-dim)] focus:border-[var(--game-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--game-accent)]/30"
              placeholder={mode === "signup" ? "Min 8 characters" : "••••••••"}
              disabled={isSubmitting}
            />
          </div>

          <Derive from={error}>
            {(error) =>
              error && (
                <p className="bg-red-500/15 border-2 border-red-500/50 px-3 py-2 text-sm text-[var(--game-danger)]">
                  {error}
                </p>
              )
            }
          </Derive>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full mt-1 disabled:opacity-50"
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
