export class HttpStatusError extends Error {
  public readonly status: number
  public readonly statusText: string
  public readonly response?: any

  constructor(
    status: number,
    statusText: string,
    message?: string,
    response?: any
  ) {
    super(message || `HTTP ${status}: ${statusText}`)
    this.name = 'HttpStatusError'
    this.status = status
    this.statusText = statusText
    this.response = response
    Object.setPrototypeOf(this, HttpStatusError.prototype)
  }

  public isRateLimitError(): boolean {
    return (
      this.status === 429 || this.message.toLowerCase().includes('rate limit')
    )
  }

  public isServerError(): boolean {
    return this.status >= 500 && this.status < 600
  }

  public isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  public shouldRetry(): boolean {
    return this.isRateLimitError() || this.isServerError()
  }
}
