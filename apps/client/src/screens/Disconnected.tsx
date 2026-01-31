export function DisconnectedScreen() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 max-w-sm text-center min-h-[50vh]">
      <p className="text-gray-400 text-sm">
        Unable to connect. Check your network or refresh the page.
      </p>
    </div>
  )
}
