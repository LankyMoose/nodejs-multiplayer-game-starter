import { computed } from "kiru"
import { auth } from "@/state/auth"
import { AuthModal } from "@/features/auth-modal"
import { ConnectedView } from "@/screens/connected"
import { DisconnectedScreen } from "@/screens/Disconnected"
import { ws } from "./state/ws"
import { game } from "./state/game"
import { ToastsRoot } from "./features/toast"

type DisplayMode = "loading" | "auth" | "disconnected" | "connected"
const displayMode = computed<DisplayMode>(() => {
  if (auth.$isLoading) return "loading"
  if (!auth.$user) return "auth"

  const wsState = ws.current?.$connectionState

  if (wsState === "disconnected") return "disconnected"
  if (wsState !== "connected" || !game.$ready) return "loading"

  return "connected"
})

export default function App() {
  return (
    <>
      <ScreenSwitch />
      <ToastsRoot />
    </>
  )
}

function ScreenSwitch() {
  switch (displayMode.value) {
    case "loading":
      return <div className="loader" />
    case "auth":
      return <AuthModal />
    case "disconnected":
      return <DisconnectedScreen />
    case "connected":
      return <ConnectedView userId={auth.$user!.id} />
  }
}
