import { signal, watch } from "kiru"

interface Settings {
  volume: number
}

const defaultSettings: Settings = {
  volume: 0.5,
}

let initialSettings = defaultSettings
try {
  const fromStorage = JSON.parse(localStorage.getItem("settings") ?? "{}")
  if (typeof fromStorage.volume === "number") {
    initialSettings.volume = fromStorage.volume
  }
} catch {}

const volume = signal(initialSettings.volume)

watch([volume], (volume) => {
  localStorage.setItem(
    "settings",
    JSON.stringify({ volume } satisfies Settings)
  )
})

export const settings = {
  volume,
}
