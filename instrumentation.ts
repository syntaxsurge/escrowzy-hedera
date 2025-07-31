export async function register() {
  // Only run in Node.js runtime, not in Edge Runtime
  // Check for Node.js specific globals that Edge Runtime doesn't have
  if (typeof require !== 'undefined') {
    console.log('🚀 Initializing server instrumentation...')

    // Dynamic imports to avoid Edge Runtime issues
    const { registerAllHandlers } = await import('@/lib/queue/handlers')
    const { startQueue, stopQueue } = await import('@/lib/queue/manager')

    // Register all job handlers
    registerAllHandlers()

    // Start the queue processor
    startQueue()

    // Set up graceful shutdown
    // Using dynamic access to avoid Edge Runtime errors
    const processModule = global.process
    if (processModule && typeof processModule.on === 'function') {
      processModule.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down queue processor...')
        stopQueue()
      })

      processModule.on('SIGINT', () => {
        console.log('SIGINT received, shutting down queue processor...')
        stopQueue()
      })
    }

    console.log('✅ Server instrumentation initialized')
  }
}
