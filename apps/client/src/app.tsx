import { Transition } from "kiru"
import { auth } from "@/state/auth"
import { AuthModal } from "@/features/auth-modal"
import { ConnectedView } from "@/screens/connected"
import { ws } from "./state/ws"

export default function App() {
  return (
    <Transition
      in={auth.$isLoading}
      duration={{
        in: 0,
        out: 150,
      }}
      initialState="entered"
      element={(state) => {
        if (
          state !== "exited" ||
          (ws.current && ws.current.$connectionState !== "connected")
        ) {
          const opacity = state === "entered" ? 1 : 0
          return <Loader opacity={opacity} />
        }

        if (auth.$user) {
          return <ConnectedView userId={auth.$user.id} />
        }

        return <AuthModal />
      }}
    />
  )
}

const Loader = ({ opacity }: { opacity: number }) => (
  <div className="loader" style={{ opacity, transitionDuration: "150ms" }} />
)
