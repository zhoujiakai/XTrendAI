import { BaseWrapper } from './BaseWrapper'
import mockTrends from '@/data/mock-trends.json'

export interface MockTrend {
  id: string
  name: string
  displayName?: string
  volume: number
  growthRate: number
  category: string
  regions: string[]
  isPublic: boolean
  relatedTweets?: number
  url?: string
  keywords?: string[]
  demographics?: {
    ageGroups: string[]
    regions: string[]
  }
  updatedAt: string
}

/**
 * 模拟数据封装 - MVP阶段使用
 * 从JSON文件读取热点数据，模拟真实API的行为
 */
export class MockWrapper extends BaseWrapper {
  constructor() {
    super({})
    this.retryCount = 1 // Mock数据不需要重试
    this.timeout = 1000 // Mock数据快速返回
  }

  /**
   * 获取所有模拟热点数据
   */
  async getTrends(): Promise<MockTrend[]> {
    this.log('获取模拟热点数据')

    // 模拟网络延迟
    await this.delay(300)

    // 返回模拟数据
    const trends = mockTrends?.trends || []
    console.log('[MockWrapper] Returning trends:', trends.length, 'items')
    return trends
  }

  /**
   * 根据地区筛选模拟数据
   */
  async getTrendsByRegion(region: string): Promise<MockTrend[]> {
    this.log('获取地区模拟热点', { region })

    await this.delay(300)

    const allTrends = mockTrends.trends || []

    // 如果是global，返回所有公共热点
    if (region === 'global') {
      return allTrends.filter((t) => t.isPublic)
    }

    // 否则筛选包含该地区的热点（公共+该地区）
    return allTrends.filter((trend) =>
      trend.isPublic || trend.regions?.includes(region)
    )
  }

  /**
   * 根据ID获取单个热点
   */
  async getTrendById(id: string): Promise<MockTrend | null> {
    this.log('获取单个模拟热点', { id })

    await this.delay(200)

    const allTrends = mockTrends.trends || []
    return allTrends.find((t) => t.id === id) || null
  }

  /**
   * 获取公共热点（Guest用户可见）
   */
  async getPublicTrends(): Promise<MockTrend[]> {
    this.log('获取公共热点')

    await this.delay(200)

    const allTrends = mockTrends.trends || []
    return allTrends.filter((t) => t.isPublic)
  }

  /**
   * 获取最后更新时间
   */
  getLastUpdateTime(): Date {
    return new Date(mockTrends.updatedAt || Date.now())
  }
}
