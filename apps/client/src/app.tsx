import { Transition } from "kiru"
import { auth } from "@/state/auth"
import { AuthModal } from "@/features/auth-modal"

export default function App() {
  return (
    <Transition
      in={auth.isLoading.value}
      duration={{
        in: 0,
        out: 150,
      }}
      initialState="entered"
      element={(state) => {
        if (state === "exited")
          return auth.isAuthenticated.value ? <Home /> : <AuthModal />

        const opacity = state === "entered" ? 1 : 0
        return (
          <div
            className="loader"
            style={{ opacity, transitionDuration: "150ms" }}
          />
        )
      }}
    />
  )
}

function Home() {
  return (
    <>
      Home
      <button onclick={auth.signOut}>Sign out</button>
    </>
  )
}
