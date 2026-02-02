import { settings } from "@/state/settings"
import SettingsIcon from "@/components/icons/settings-icon"
import { play } from "@/sound"

export function Settings() {
  return (
    <>
      <button type="button" popoverTarget="settings-popover">
        <SettingsIcon />
      </button>
      <div
        id="settings-popover"
        className="game-panel p-4 open:flex flex-col gap-4"
        popover
      >
        <header>Settings</header>
        <div className="game-inner-panel rounded p-4">
          <div className="grid grid-cols-2 gap-4 justify-between">
            <div>Volume</div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              bind:value={settings.volume}
              oninput={() => play("button")}
            />
          </div>
        </div>
      </div>
    </>
  )
}
