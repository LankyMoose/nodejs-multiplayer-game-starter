import { game } from "@/state/game"
import ConnectedLayout from "./_layout"
import GameScreen from "./game-screen"
import LobbyViewScreen from "./lobby-view-screen"
import LobbySetupScreen from "./lobby-setup-screen"

interface ConnectedSwitchProps {
  userId: string
}

export default function ConnectedScreen({ userId }: ConnectedSwitchProps) {
  return (
    <ConnectedLayout>
      {game.$instance ? (
        <GameScreen gameInstance={game.$instance} userId={userId} />
      ) : game.$lobby ? (
        <LobbyViewScreen lobby={game.$lobby} userId={userId} />
      ) : (
        <LobbySetupScreen />
      )}
    </ConnectedLayout>
  )
}
