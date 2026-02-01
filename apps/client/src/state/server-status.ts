import { env } from "../env"
import { withMinDuration } from "../utils"
import { loaderText } from "./loader"

export async function waitForServerOK() {
  let healthCheckResponse: Response | null = null
  let currentHealthCheckTimeout = 400
  loaderText.value = "Connecting..."

  while (!healthCheckResponse) {
    healthCheckResponse = await withMinDuration(500, () =>
      fetch(`${env.HTTP_BASE_URL}/health`).catch(() => null)
    )

    if (!healthCheckResponse) {
      loaderText.value = "Server did not respond. Retrying..."
      await new Promise((resolve) =>
        setTimeout(resolve, currentHealthCheckTimeout)
      )
      if (currentHealthCheckTimeout > 5000) {
        continue
      }
      currentHealthCheckTimeout *= 2
    }
  }
}
