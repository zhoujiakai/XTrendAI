import { Trend } from '@/types'
import mockTrends from '@/data/mock-trends.json'

export class TrendService {
  private static cache: {
    trends: Trend[]
    lastUpdated: Date
  } | null = null

  private static readonly CACHE_DURATION = 15 * 60 * 1000 // 15分钟

  /**
   * 获取所有热点
   */
  static async getAllTrends(): Promise<Trend[]> {
    // 检查缓存
    if (this.cache && Date.now() - this.cache.lastUpdated.getTime() < this.CACHE_DURATION) {
      return this.cache.trends
    }

    // 从JSON文件加载（MVP阶段）
    const trends = mockTrends.trends as Trend[]

    // 更新缓存
    this.cache = {
      trends,
      lastUpdated: new Date(),
    }

    return trends
  }

  /**
   * 根据地区筛选热点
   */
  static async getTrendsByRegion(region: string): Promise<Trend[]> {
    const allTrends = await this.getAllTrends()

    return allTrends.filter((trend) =>
      trend.regions.includes(region) || trend.regions.includes('global') || trend.isPublic
    )
  }

  /**
   * 获取公共热点（所有用户可见）
   */
  static async getPublicTrends(): Promise<Trend[]> {
    const allTrends = await this.getAllTrends()
    return allTrends.filter((trend) => trend.isPublic)
  }

  /**
   * 根据ID获取热点
   */
  static async getTrendById(id: string): Promise<Trend | null> {
    const allTrends = await this.getAllTrends()
    return allTrends.find((trend) => trend.id === id) || null
  }

  /**
   * 个性化筛选热点
   */
  static async getFilteredTrends(params: {
    region?: string
    ageGroup?: string
    scenarioCount?: number
    limit?: number
  }): Promise<Trend[]> {
    let trends = await this.getAllTrends()

    // 地区过滤
    if (params.region && params.region !== 'global') {
      trends = trends.filter(
        (t) => t.regions.includes(params.region!) || t.regions.includes('global') || t.isPublic
      )
    }

    // 年龄偏好权重调整
    if (params.ageGroup) {
      trends = trends.map((trend) => {
        if (trend.demographics?.ageGroups.includes(params.ageGroup!)) {
          return { ...trend, growthRate: trend.growthRate * 1.2 }
        }
        return trend
      })
    }

    // 排序：热度 + 增长率
    trends.sort((a, b) => {
      const scoreA = a.volume * (1 + a.growthRate / 100)
      const scoreB = b.volume * (1 + b.growthRate / 100)
      return scoreB - scoreA
    })

    // 公共热点始终在前
    const publicTrends = trends.filter((t) => t.isPublic)
    const otherTrends = trends.filter((t) => !t.isPublic)

    // 合并并限制数量
    const result = [...publicTrends, ...otherTrends]
    return result.slice(0, params.limit || 10)
  }

  /**
   * 强制刷新缓存
   */
  static async refreshCache(): Promise<Trend[]> {
    this.cache = null
    return this.getAllTrends()
  }
}
