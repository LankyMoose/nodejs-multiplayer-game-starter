import { createContext, useContext } from "kiru"

export const ToastItemContext = createContext<{ cancel: () => void }>(null!)

export const useToastItem = () => useContext(ToastItemContext)
