import { computed } from "kiru"
import { auth } from "@/state/auth"
import { AuthModal } from "@/features/auth-modal"
import { ConnectedView } from "@/screens/connected"
import { DisconnectedScreen } from "@/screens/Disconnected"
import { ws } from "./state/ws"
import { game } from "./state/game"
import { ToastsRoot } from "./features/toast"

const displayMode = computed(() => {
  if (auth.$isLoading) {
    return "loading"
  }
  if (!auth.$user) {
    return "auth"
  }
  if (ws.current?.$connectionState === "disconnected") {
    return "disconnected"
  }
  if (
    !ws.current ||
    ws.current.$connectionState !== "connected" ||
    !game.$ready
  ) {
    return "loading"
  }
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
