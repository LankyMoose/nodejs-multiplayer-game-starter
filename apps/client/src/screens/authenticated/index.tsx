import { game } from "@/state/game"
import AuthenticatedLayout from "./_layout"
import GameScreen from "./game-screen"
import LobbyViewScreen from "./lobby-view-screen"
import LobbySetupScreen from "./lobby-setup-screen"

interface AuthenticatedScreenSwitchProps {
  userId: string
}

export default function AuthenticatedScreenSwitch({
  userId,
}: AuthenticatedScreenSwitchProps) {
  return (
    <AuthenticatedLayout>
      {game.$instance ? (
        <GameScreen gameInstance={game.$instance} userId={userId} />
      ) : game.$lobby ? (
        <LobbyViewScreen lobby={game.$lobby} userId={userId} />
      ) : (
        <LobbySetupScreen />
      )}
    </AuthenticatedLayout>
  )
}
