import { BaseWrapper } from './BaseWrapper'

export interface MCPTrend {
  id: string
  name: string
  volume: number
  growthRate: number
  category: string
  regions?: string[]
  timestamp?: string
  keywords?: string[]
}

/**
 * MCP服务封装
 * 作为备选数据源，连接到MCP服务获取热点数据
 */
export class MCPWrapper extends BaseWrapper<{ serverUrl: string }> {
  constructor(config?: { serverUrl?: string }) {
    super({
      serverUrl: config?.serverUrl || process.env.MCP_SERVER_URL || 'http://localhost:3001'
    })
  }

  /**
   * 从MCP服务获取热点数据
   */
  async getTrends(): Promise<MCPTrend[]> {
    this.log('获取MCP服务热点')

    return this.fetchWithRetry(async () => {
      const response = await this.fetchWithTimeout(async () => {
        return fetch(`${this.config.serverUrl}/trends`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 20 })
        })
      })

      if (!response.ok) {
        throw new Error(`MCP服务错误: ${response.status} ${response.statusText}`)
      }

      return response.json()
    }, 'MCPWrapper.getTrends')
  }

  /**
   * 根据地区获取热点
   */
  async getTrendsByRegion(region: string): Promise<MCPTrend[]> {
    this.log('获取MCP服务地区热点', { region })

    return this.fetchWithRetry(async () => {
      const response = await this.fetchWithTimeout(async () => {
        return fetch(`${this.config.serverUrl}/trends/region`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ region, limit: 20 })
        })
      })

      if (!response.ok) {
        throw new Error(`MCP服务错误: ${response.status}`)
      }

      return response.json()
    }, 'MCPWrapper.getTrendsByRegion')
  }

  /**
   * 检查服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/health`, {
        signal: AbortSignal.timeout(2000)
      })
      return response.ok
    } catch {
      return false
    }
  }
}
