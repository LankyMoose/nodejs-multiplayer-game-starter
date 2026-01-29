import { isAuthenticated, isAuthLoading, signOut } from "./state"
import { AuthModal } from "./features/auth-modal"
import { Transition } from "kiru"

export default function App() {
  return (
    <>
      <Transition
        in={isAuthLoading.value}
        duration={150}
        element={(state) => {
          if (state === "exited")
            return isAuthenticated.value ? <Home /> : <AuthModal />

          const opacity = state === "entered" ? 1 : 0
          return (
            <div
              className="loader"
              style={{ opacity, transitionDuration: "150ms" }}
            />
          )
        }}
      />
    </>
  )
}

function Home() {
  return (
    <>
      Home
      <button onclick={signOut}>Sign out</button>
    </>
  )
}
