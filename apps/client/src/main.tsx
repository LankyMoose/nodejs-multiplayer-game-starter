import "./global.css"
import { mount } from "kiru"
import App from "./app"
import { play } from "./sound"

mount(<App />, document.getElementById("app")!, { name: "client" })

// Play sounds on button click (user gesture unlocks audio)
document.body.addEventListener(
  "click",
  (e) => {
    const btn = (e.target as Element).closest("button")
    if (!btn) return
    const isCancel =
      btn.classList.contains("btn-ghost") ||
      btn.classList.contains("btn-cancel")
    play(isCancel ? "cancel" : "button")
  },
  { capture: true }
)
