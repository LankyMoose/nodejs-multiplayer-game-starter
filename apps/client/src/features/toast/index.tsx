import {
  createContext,
  memo,
  Signal,
  signal,
  Transition,
  TransitionState,
  useComputed,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "kiru"
import { className as cls } from "kiru/utils"

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

const ToastItemContext = createContext<{ cancel: () => void }>(null!)

export const useToastItem = () => useContext(ToastItemContext)

const defaultDuration = 4000

const toasts = signal<Toast[]>([])

setInterval(() => {
  let didExpire = false
  for (let i = 0; i < toasts.value.length; i++) {
    const t = toasts.value[i]
    if (t.paused) continue
    t.remaining.value -= 16
    if (t.remaining.value <= 0) {
      didExpire = true
      t.expired = true
    }
  }
  if (didExpire) {
    toasts.notify()
  }
}, 1000 / 60)

let id = 0

type ToastOptions = {
  type: Toast["type"]
  children: () => JSX.Children
  pauseOnHover?: boolean
  duration?: number
}
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

export const ToastsRoot: Kiru.FC = () => {
  return toasts.value.map((toast, i) => (
    <Transition
      key={toast.id}
      in={!toast.expired}
      initialState="exited"
      duration={{
        in: 50,
        out: 300,
      }}
      onTransitionEnd={(state) => {
        if (state === "exited") {
          toasts.value = toasts.value.filter((t) => t.id !== toast.id)
        }
      }}
      element={(state) => <ToastItem toast={toast} state={state} index={i} />}
    />
  ))
}

type ToastItemProps = {
  toast: Toast
  state: TransitionState
  index: number
}

const ToastItem = memo(({ toast, state, index }: ToastItemProps) => {
  const width = useRef(400)
  const translateX = state === "entered" ? 0 : width.current
  const translateY = useMemo<string>(() => {
    let offset = 0
    const items = toasts.value
    for (let i = 0; i < index; i++) {
      offset -= items[i].height
    }
    return `calc(${offset}px - ${index} * 1rem)`
  }, [index])

  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!ref.current) return
    const box = ref.current.getBoundingClientRect()
    toast.height = box.height
    width.current = box.width + 32
  }, [])

  const accentBorder =
    toast.type === "info"
      ? "border-l-[var(--game-accent)]"
      : toast.type === "success"
        ? "border-l-[var(--game-success)]"
        : toast.type === "danger"
          ? "border-l-[var(--game-danger)]"
          : "border-l-[var(--game-gold)]"

  return (
    <div
      ref={ref}
      onmouseenter={() => {
        if (toast.pauseOnHover) toast.paused = true
      }}
      onmouseleave={() => {
        if (toast.pauseOnHover) toast.paused = false
      }}
      style={{
        transform: `translate(${translateX}px, ${translateY})`,
      }}
      className={cls(
        "transition-transform duration-300 ease-out",
        "absolute right-4 bottom-4 left-4 sm:left-auto sm:max-w-sm",
        "game-panel border-l-4 pl-4 pr-3 py-3 overflow-hidden",
        "flex flex-col items-stretch justify-between gap-2",
        accentBorder
      )}
    >
      <div className="text-sm text-[var(--game-text)] leading-snug">
        <ToastItemContext.Provider
          value={{
            cancel: () => {
              toast.expired = true
              toasts.notify()
            },
          }}
        >
          <toast.children />
        </ToastItemContext.Provider>
      </div>
      <ToastProgress toast={toast} />
    </div>
  )
})

function ToastProgress({ toast }: { toast: Toast }) {
  const styles = useComputed(() => {
    const remaining = toast.remaining.value
    const pct = Math.max(0, 100 - (remaining / toast.duration) * 100)
    const color =
      toast.type === "info"
        ? "var(--game-accent)"
        : toast.type === "success"
          ? "var(--game-success)"
          : toast.type === "danger"
            ? "var(--game-danger)"
            : "var(--game-gold)"
    return { width: `${pct}%`, backgroundColor: color }
  })

  return (
    <div
      className="absolute left-0 right-0 bottom-0 h-0.5 overflow-hidden bg-white/10"
      role="progressbar"
      aria-valuenow={toast.duration - toast.remaining.value}
      aria-valuemin={0}
      aria-valuemax={toast.duration}
    >
      <div
        className="h-full transition-[width] duration-150"
        style={styles}
      />
    </div>
  )
}
