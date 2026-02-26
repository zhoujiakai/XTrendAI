import { BaseWrapper } from './BaseWrapper'

// X API 配置接口
export interface XApiConfig {
  apiKey: string
  apiSecret: string
  bearerToken: string
  baseUrl: string
}

// X API 趋势数据接口
export interface XApiTrend {
  name: string
  url: string
  promoted_content: number
  query: string
  tweet_volume: number
}

// X API 错误类型
export enum XApiErrorType {
  AUTH_FAILED = 'AUTH_FAILED',           // 认证失败
  RATE_LIMITED = 'RATE_LIMITED',         // 速率限制
  SERVER_ERROR = 'SERVER_ERROR',         // 服务器错误
  NETWORK_ERROR = 'NETWORK_ERROR',       // 网络错误
  TIMEOUT = 'TIMEOUT',                   // 超时
  UNKNOWN = 'UNKNOWN'                    // 未知错误
}

// X API 错误类
export class XApiError extends Error {
  type: XApiErrorType
  statusCode: number
  retryAfter: number | null

  constructor(
    message: string,
    type: XApiErrorType,
    statusCode: number = 0,
    retryAfter: number | null = null
  ) {
    super(message)
    this.name = 'XApiError'
    this.type = type
    this.statusCode = statusCode
    this.retryAfter = retryAfter
  }

  /**
   * 是否可以重试
   */
  isRetryable(): boolean {
    return [
      XApiErrorType.RATE_LIMITED,
      XApiErrorType.SERVER_ERROR,
      XApiErrorType.NETWORK_ERROR,
      XApiErrorType.TIMEOUT
    ].includes(this.type)
  }

  /**
   * 获取建议的重试延迟（毫秒）
   */
  getRetryDelay(): number {
    if (this.type === XApiErrorType.RATE_LIMITED) {
      // 429错误，使用 Retry-After 头或默认15分钟
      return (this.retryAfter || 900) * 1000
    }

    if (this.type === XApiErrorType.SERVER_ERROR) {
      return 60000 // 1分钟
    }

    return 5000 // 默认5秒
  }
}

// Yahoo天气ID映射
const WOEID_MAP: Record<string, number> = {
  'us': 23424977,     // 美国
  'cn': 23424781,     // 中国
  'uk': 23424975,     // 英国
  'jp': 23424856,     // 日本
  'ca': 23424775,     // 加拿大
  'au': 23424748,     // 澳大利亚
  'in': 23424848,     // 印度
  'br': 23424768,     // 巴西
  'de': 23424829,     // 德国
  'fr': 23424819,     // 法国
  'global': 1        // 全球
}

// X API v1.1 端点（trends/place 仍需使用v1.1）
const V1_BASE_URL = 'https://api.twitter.com/1.1'
const V2_BASE_URL = 'https://api.twitter.com/2'

/**
 * X(Twitter) API 封装
 * 用于生产环境接入真实的X平台热点数据
 *
 * 注意：Twitter API v2 不支持 trends 端点
 * 需要使用 v1.1 的 trends/place 端点
 */
export class XApiWrapper extends BaseWrapper<XApiConfig> {
  private lastError: XApiError | null = null
  private rateLimitReset: number | null = null
  private requestCount: number = 0
  private maxRequestsPerWindow: number = 75 // v1.1 API限制

  constructor(config?: XApiConfig) {
    super(config || {
      apiKey: process.env.X_API_KEY || '',
      apiSecret: process.env.X_API_SECRET || '',
      bearerToken: process.env.X_BEARER_TOKEN || '',
      baseUrl: V1_BASE_URL // 使用v1.1
    })

    // 初始化时检查配置
    if (!this.isConfigured()) {
      this.logError('X API 配置不完整', {
        hasApiKey: !!this.config.apiKey,
        hasApiSecret: !!this.config.apiSecret,
        hasBearerToken: !!this.config.bearerToken
      })
    }
  }

  /**
   * 获取趋势列表
   * @param woeid Yahoo天气ID，1=全球
   */
  async getTrends(woeid: number = 1): Promise<XApiTrend[]> {
    // 检查配置
    if (!this.isConfigured()) {
      throw new XApiError(
        'X API 配置不完整，请设置 X_BEARER_TOKEN 环境变量',
        XApiErrorType.AUTH_FAILED
      )
    }

    // 检查速率限制
    if (this.rateLimitReset && Date.now() < this.rateLimitReset) {
      const waitTime = Math.ceil((this.rateLimitReset - Date.now()) / 1000)
      throw new XApiError(
        `X API 速率限制，请等待 ${waitTime} 秒后重试`,
        XApiErrorType.RATE_LIMITED,
        429,
        waitTime
      )
    }

    this.log('获取X API趋势', { woeid })

    return this.fetchWithRetry(async () => {
      return this.fetchWithTimeout(async () => {
        return this.fetchTrendsFromAPI(woeid)
      })
    }, 'XApiWrapper.getTrends')
  }

  /**
   * 实际执行API请求
   */
  private async fetchTrendsFromAPI(woeid: number): Promise<XApiTrend[]> {
    try {
      const url = `${this.config.baseUrl}/trends/place.json?id=${woeid}`
      this.requestCount++

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        }
      })

      // 处理响应状态
      await this.handleResponseStatus(response)

      // 解析响应
      const data = await response.json()
      const trends = data[0]?.trends || []

      this.log(`获取到 ${trends.length} 条趋势`, {
        woeid,
        asOf: data[0]?.as_of
      })

      return trends

    } catch (error) {
      if (error instanceof XApiError) {
        this.lastError = error
        throw error
      }

      // 处理网络错误
      const networkError = new XApiError(
        `网络错误: ${(error as Error).message}`,
        XApiErrorType.NETWORK_ERROR
      )
      this.lastError = networkError
      throw networkError
    }
  }

  /**
   * 处理API响应状态
   */
  private async handleResponseStatus(response: Response): Promise<void> {
    const status = response.status
    const statusText = response.statusText

    // 检查速率限制
    const remaining = response.headers.get('x-rate-limit-remaining')
    const reset = response.headers.get('x-rate-limit-reset')

    if (remaining !== null) {
      this.requestCount = this.maxRequestsPerWindow - parseInt(remaining)
    }

    if (reset) {
      this.rateLimitReset = parseInt(reset) * 1000
    }

    // 处理各种错误状态
    switch (status) {
      case 200:
      case 204:
        return

      case 400:
        throw new XApiError(
          `X API 请求参数错误: ${statusText}`,
          XApiErrorType.UNKNOWN,
          status
        )

      case 401:
      case 403:
        throw new XApiError(
          `X API 认证失败，请检查 Bearer Token: ${statusText}`,
          XApiErrorType.AUTH_FAILED,
          status
        )

      case 404:
        throw new XApiError(
          `X API 端点不存在: ${statusText}`,
          XApiErrorType.UNKNOWN,
          status
        )

      case 429:
        const retryAfter = response.headers.get('retry-after')
        const retrySeconds = retryAfter ? parseInt(retryAfter) : 900

        throw new XApiError(
          `X API 请求超限，请等待 ${retrySeconds} 秒`,
          XApiErrorType.RATE_LIMITED,
          status,
          retrySeconds
        )

      case 500:
      case 502:
      case 503:
      case 504:
        throw new XApiError(
          `X API 服务器错误: ${status}`,
          XApiErrorType.SERVER_ERROR,
          status
        )

      default:
        throw new XApiError(
          `X API 未知错误: ${status} ${statusText}`,
          XApiErrorType.UNKNOWN,
          status
        )
    }
  }

  /**
   * 根据地区获取趋势
   */
  async getTrendsByRegion(region: string): Promise<XApiTrend[]> {
    const woeid = WOEID_MAP[region] ?? 1

    if (!WOEID_MAP[region]) {
      this.log(`未找到地区 ${region} 的WOEID，使用全球WOEID`)
    }

    return this.getTrends(woeid)
  }

  /**
   * 获取全球趋势
   */
  async getGlobalTrends(): Promise<XApiTrend[]> {
    return this.getTrends(1)
  }

  /**
   * 获取多个地区的趋势
   */
  async getTrendsForRegions(regions: string[]): Promise<Map<string, XApiTrend[]>> {
    const results = new Map<string, XApiTrend[]>()

    // 串行请求以避免速率限制
    for (const region of regions) {
      try {
        const trends = await this.getTrendsByRegion(region)
        results.set(region, trends)
      } catch (error) {
        this.logError(`获取 ${region} 趋势失败`, error)
        results.set(region, [])
      }
    }

    return results
  }

  /**
   * 搜索推文（需要更高权限）
   */
  async searchTweets(query: string, maxResults: number = 10): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new XApiError(
        'X API 配置不完整',
        XApiErrorType.AUTH_FAILED
      )
    }

    this.log('搜索推文', { query, maxResults })

    try {
      const url = `${V2_BASE_URL}/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.config.bearerToken}`,
          'Content-Type': 'application/json'
        }
      })

      await this.handleResponseStatus(response)

      const data = await response.json()
      return data.data || []

    } catch (error) {
      if (error instanceof XApiError) {
        throw error
      }

      throw new XApiError(
        `搜索推文失败: ${(error as Error).message}`,
        XApiErrorType.UNKNOWN
      )
    }
  }

  /**
   * 检查配置是否有效
   */
  isConfigured(): boolean {
    return !!this.config.bearerToken
  }

  /**
   * 获取最后一个错误
   */
  getLastError(): XApiError | null {
    return this.lastError
  }

  /**
   * 获取速率限制状态
   */
  getRateLimitStatus(): {
    remaining: number
    resetTime: number | null
    isLimited: boolean
  } {
    const remaining = Math.max(0, this.maxRequestsPerWindow - this.requestCount)
    const now = Date.now()
    const isLimited = this.rateLimitReset !== null && now < this.rateLimitReset

    return {
      remaining,
      resetTime: this.rateLimitReset,
      isLimited
    }
  }

  /**
   * 重置速率限制状态
   */
  resetRateLimit(): void {
    this.rateLimitReset = null
    this.requestCount = 0
  }

  /**
   * 获取支持的地区列表
   */
  static getSupportedRegions(): string[] {
    return Object.keys(WOEID_MAP)
  }

  /**
   * 获取地区的WOEID
   */
  static getWOEID(region: string): number | null {
    return WOEID_MAP[region] ?? null
  }
}
