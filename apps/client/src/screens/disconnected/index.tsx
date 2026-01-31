import { env } from "@/env"

export default function DisconnectedScreen() {
  return (
    <div className="game-panel p-8 max-w-sm text-center">
      <h2 className="game-title text-lg tracking-wide text-(--game-text) mb-2">
        {env.APP_NAME}
      </h2>
      <p className="text-(--game-text-dim) text-sm">
        Unable to connect. Check your network or refresh the page.
      </p>
    </div>
  )
}
