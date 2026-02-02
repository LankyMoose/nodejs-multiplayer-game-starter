import { auth } from "@/state/auth"
import { ws } from "@/state/ws"
import { game } from "@/state/game"
import { loaderText } from "@/state/loader"
import { init } from "@/state/core"
import ToastsRoot from "@/features/toasts"
import AuthModal from "@/features/auth-modal"
import ConnectedScreen from "@/screens/connected"

window.__kiru.on("mount", (ctx) => ctx.name == "client" && init())

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

  console.log("ScreenSwitch", { authLoading, user, wsState, gameReady, game })
  if (authLoading) return <Loader />
  if (!user) return <AuthModal />

  if (wsState !== "connected" || !gameReady) return <Loader />

  return <ConnectedScreen userId={user.id} />
}

const Loader = () => (
  <div className="flex flex-col gap-4 items-center">
    <div className="loader" />
    {loaderText}
  </div>
)
