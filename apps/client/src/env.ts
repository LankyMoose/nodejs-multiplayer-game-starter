const HOST = import.meta.env.VITE_API_HOST ?? "localhost"
const PORT = import.meta.env.VITE_API_PORT
  ? `:${import.meta.env.VITE_API_PORT}`
  : ""

const APP_NAME =
  import.meta.env.VITE_APP_NAME ?? "Nodejs Multiplayer Game Starter"

const HTTP_PROTOCOL = import.meta.env.DEV ? "http" : "https"
const WS_PROTOCOL = import.meta.env.DEV ? "ws" : "wss"

export const env = {
  HTTP_BASE_URL: `${HTTP_PROTOCOL}://${HOST}${PORT}`,
  WS_BASE_URL: `${WS_PROTOCOL}://${HOST}${PORT}`,
  APP_NAME,
}
