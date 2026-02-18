const baseUrl = new URL(
  import.meta.env.VITE_API_HOST ?? String(window.location)
)

const HOST = baseUrl.hostname
const PORT = baseUrl.port ? `:${baseUrl.port}` : ""

const APP_NAME =
  import.meta.env.VITE_APP_NAME ?? "Nodejs Multiplayer Game Starter"

const USE_TLS = import.meta.env.PROD && window.location.protocol === "https:"
const HTTP_PROTOCOL = USE_TLS ? "https" : "http"
const WS_PROTOCOL = USE_TLS ? "wss" : "ws"

export const env = {
  HTTP_BASE_URL: `${HTTP_PROTOCOL}://${HOST}${PORT}`,
  WS_BASE_URL: `${WS_PROTOCOL}://${HOST}${PORT}`,
  APP_NAME,
}
