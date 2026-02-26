/**
 * 基础封装类 - 提供重试、超时、日志等通用功能
 */
export abstract class BaseWrapper<TConfig = Record<string, unknown>> {
  protected config: TConfig
  protected retryCount: number = 3
  protected timeout: number = 10000

  constructor(config: TConfig) {
    this.config = config
  }

  /**
   * 带重试的请求方法
   */
  protected async fetchWithRetry<R>(
    fn: () => Promise<R>,
    context: string
  ): Promise<R> {
    let lastError: Error | undefined

    for (let i = 0; i < this.retryCount; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        console.warn(`[${context}] 请求失败，重试 ${i + 1}/${this.retryCount}`)

        if (i < this.retryCount - 1) {
          await this.delay(1000 * (i + 1)) // 指数退避
        }
      }
    }

    throw new Error(`[${context}] 请求失败: ${lastError!.message}`)
  }

  /**
   * 带超时的请求方法
   */
  protected async fetchWithTimeout<R>(
    fn: () => Promise<R>,
    timeoutMs: number = this.timeout
  ): Promise<R> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('请求超时')), timeoutMs)
      )
    ])
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 日志记录
   */
  protected log(message: string, data?: unknown): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${this.constructor.name}] ${message}`, data || '')
    }
  }

  /**
   * 错误日志
   */
  protected logError(message: string, error?: unknown): void {
    console.error(`[${this.constructor.name}] ${message}`, error || '')
  }
}
