export async function withMinDuration<T>(
  duration: number,
  callback: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  const result = await callback()
  const end = Date.now()
  const elapsed = end - start
  if (elapsed < duration) {
    await new Promise((resolve) => setTimeout(resolve, duration - elapsed))
  }
  return result
}
