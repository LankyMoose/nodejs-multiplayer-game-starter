import { unwrap, type ElementProps } from "kiru"
import { className as cls } from "kiru/utils"

export default function Input({ className, ...props }: ElementProps<"input">) {
  return (
    <input
      className={cls(
        "game-inner-panel px-3 py-2 text-sm focus:outline-none focus:border-(--game-accent) placeholder-(--game-text-dim)",
        unwrap(className)
      )}
      {...props}
    />
  )
}
