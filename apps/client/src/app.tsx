import { auth } from "@/state/auth"
import { ws } from "@/state/ws"
import { game } from "@/state/game"
import ToastsRoot from "@/features/toasts"
import AuthModal from "@/features/auth-modal"
import DisconnectedScreen from "@/screens/disconnected"
import ConnectedScreen from "@/screens/connected"

export default function App() {
  return (
    <>
      <ScreenSwitch />
      <ToastsRoot />
    </>
  )
}

function ScreenSwitch() {
  const authLoading = auth.$isLoading,
    user = auth.$user,
    wsState = ws.current?.$connectionState,
    gameReady = game.$ready

  if (authLoading) return <Loader />
  if (!user) return <AuthModal />

  if (wsState === "disconnected") return <DisconnectedScreen />
  if (wsState !== "connected" || !gameReady) return <Loader />

  return <ConnectedScreen userId={user.id} />
}

const Loader = () => <div className="loader" />
