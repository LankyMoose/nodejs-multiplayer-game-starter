/**
 * Play a sound from /sounds/. Uses user gesture (e.g. button click) so no autoplay issues.
 */
const sounds = new Map<string, HTMLAudioElement>()

function getAudio(slug: string): HTMLAudioElement | undefined {
  if (sounds.has(slug)) return sounds.get(slug)!
  const ext = slug.endsWith(".ogg") ? "" : ".ogg"
  const a = new Audio(`/sounds/${slug}${ext}`)
  a.volume = 0.5
  sounds.set(slug, a)
  return a
}

export function play(slug: string): void {
  try {
    const a = getAudio(slug)
    if (!a) return
    a.currentTime = 0
    a.play().catch(() => {})
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
