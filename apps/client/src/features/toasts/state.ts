import { signal, Signal } from "kiru"

export type Toast = {
  id: number
  type: "info" | "success" | "warning" | "danger"
  children: () => JSX.Children
  height: number
  expired?: boolean
  pauseOnHover?: boolean
  paused?: boolean
  remaining: Signal<number>
  duration: number
}

export type ToastOptions = {
  type: Toast["type"]
  children: () => JSX.Children
  pauseOnHover?: boolean
  duration?: number
}

const defaultDuration = 4000
export const toasts = signal<Toast[]>([])

setInterval(() => {
  let didExpire = false
  for (let i = 0; i < toasts.value.length; i++) {
    const t = toasts.value[i]
    if (t.paused) continue
    t.remaining.value -= 16
    if (t.remaining.value <= 0) {
      didExpire = true
      t.expired = true
      Signal.dispose(t.remaining)
    }
  }
  if (didExpire) {
    toasts.notify()
  }
}, 1000 / 60)

let id = 0

export const toast = (options: ToastOptions) => {
  const { type, children, duration, pauseOnHover } = options

  const _duration = duration ?? defaultDuration
  const toast: Toast = {
    id: ++id,
    type,
    height: 70,
    children,
    remaining: signal(_duration),
    duration: _duration,
    pauseOnHover,
  }

  toasts.value = [...toasts.value, toast]
}
