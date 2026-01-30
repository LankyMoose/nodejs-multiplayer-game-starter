const HOST = import.meta.env.VITE_API_HOST ?? "localhost"
const PORT = import.meta.env.VITE_API_PORT
  ? `:${import.meta.env.VITE_API_PORT}`
  : ""

export const env = {
  HOST,
  PORT,
}
