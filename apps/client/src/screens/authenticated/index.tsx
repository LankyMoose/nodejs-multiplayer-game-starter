import { game } from "@/state/game";
import { spaceGame } from "@/state/space-game";
import AuthenticatedLayout from "./_layout";
import GameScreen from "./game-screen";
import LobbyViewScreen from "./lobby-view-screen";
import LobbySetupScreen from "./lobby-setup-screen";
import SpaceGameScreen from "./space-game-screen";

interface AuthenticatedScreenSwitchProps {
  userId: string;
}

export default function AuthenticatedScreenSwitch({
  userId,
}: AuthenticatedScreenSwitchProps) {
  const spaceInstanceId = spaceGame.$instanceId;

  // Show space game if in an instance
  if (spaceInstanceId) {
    return <SpaceGameScreen userId={userId} />;
  }

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
  );
}
