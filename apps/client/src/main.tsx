import "./global.css"
import { mount } from "kiru"
import App from "./app"
import { play } from "./sound"

mount(<App />, document.getElementById("app")!, { name: "client" })

// Play sounds on button click (user gesture unlocks audio)
document.body.addEventListener(
  "click",
  (e) => {
    if (!(e.target instanceof HTMLElement)) return
    const btn = e.target.closest("button")
    if (!btn) return

    const isCancel = btn.dataset.cancel === "true"
    play(isCancel ? "cancel" : "button")
  },
  { capture: true }
)
