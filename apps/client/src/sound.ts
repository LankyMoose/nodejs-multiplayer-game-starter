import { settings } from "@/state/settings"

/**
 * Play a sound from /sounds/. Uses user gesture (e.g. button click) so no autoplay issues.
 */
const sounds = new Map<string, HTMLAudioElement>()

function getAudio(slug: string): HTMLAudioElement | undefined {
  if (sounds.has(slug)) return sounds.get(slug)!
  const ext = slug.endsWith(".ogg") ? "" : ".ogg"
  const a = new Audio(`/sounds/${slug}${ext}`)
  sounds.set(slug, a)
  return a
}

export async function play(slug: string): Promise<void> {
  try {
    const a = getAudio(slug)
    if (!a) return
    a.volume = settings.volume.value
    a.currentTime = 0
    return a.play()
  } catch {
    // ignore
  }
}

export function playButton(): void {
  play("button")
}

export function playCancel(): void {
  play("cancel")
}
