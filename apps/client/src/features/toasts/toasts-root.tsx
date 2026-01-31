import { Transition } from "kiru"
import { toasts } from "./state"
import ToastItem from "./toast-item"

export default function ToastsRoot() {
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
