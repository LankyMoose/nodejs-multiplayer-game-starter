const HOST = import.meta.env.VITE_API_HOST ?? "localhost"
const PORT = import.meta.env.VITE_API_PORT
  ? `:${import.meta.env.VITE_API_PORT}`
  : ""

const APP_NAME = import.meta.env.VITE_APP_NAME
export const env = {
  HOST,
  PORT,
  APP_NAME,
}
