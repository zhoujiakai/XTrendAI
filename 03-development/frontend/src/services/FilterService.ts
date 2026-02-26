import { Trend, UserProfile } from '@/types'

/**
 * 筛选服务 - 负责热点个性化筛选逻辑
 */
export class FilterService {
  /**
   * 根据用户画像筛选热点
   */
  static filterTrends(
    trends: Trend[],
    profile: UserProfile | null,
    options: {
      limit?: number
      includePublic?: boolean
    } = {}
  ): Trend[] {
    const { limit = 10, includePublic = true } = options

    let filtered = [...trends]

    // 地区过滤
    if (profile?.region && profile.region !== 'global') {
      filtered = filtered.filter((trend) =>
        trend.regions.includes(profile.region!) || trend.regions.includes('global')
      )
    }

    // 年龄偏好权重调整
    if (profile?.ageGroup) {
      filtered = filtered.map((trend) => {
        if (trend.demographics?.ageGroups.includes(profile.ageGroup!)) {
          return { ...trend, growthRate: trend.growthRate * 1.2 }
        }
        return trend
      })
    }

    // 排序：热度 + 增长率
    filtered.sort((a, b) => {
      const scoreA = a.volume * (1 + a.growthRate / 100)
      const scoreB = b.volume * (1 + b.growthRate / 100)
      return scoreB - scoreA
    })

    // 公共热点始终在前面
    if (includePublic) {
      const publicTrends = filtered.filter((t) => t.isPublic)
      const otherTrends = filtered.filter((t) => !t.isPublic)
      filtered = [...publicTrends, ...otherTrends]
    }

    // 限制数量
    return filtered.slice(0, limit)
  }

  /**
   * 获取公共热点（Guest用户）
   */
  static getPublicTrends(trends: Trend[], limit: number = 10): Trend[] {
    return trends
      .filter((t) => t.isPublic)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit)
  }

  /**
   * 根据分类筛选
   */
  static filterByCategory(trends: Trend[], category: string): Trend[] {
    return trends.filter((t) => t.category === category)
  }

  /**
   * 根据地区筛选
   */
  static filterByRegion(trends: Trend[], region: string): Trend[] {
    return trends.filter((t) =>
      t.regions.includes(region) || t.regions.includes('global') || t.isPublic
    )
  }

  /**
   * 搜索热点（按关键词）
   */
  static searchTrends(trends: Trend[], query: string): Trend[] {
    const lowerQuery = query.toLowerCase()
    return trends.filter((trend) => {
      const name = trend.name.toLowerCase()
      const displayName = (trend.displayName || trend.name).toLowerCase()
      const keywords = trend.keywords?.map(k => k.toLowerCase()) || []

      return (
        name.includes(lowerQuery) ||
        displayName.includes(lowerQuery) ||
        keywords.some(k => k.includes(lowerQuery))
      )
    })
  }
}
