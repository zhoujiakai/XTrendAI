import { Trend } from '@/types'
import { createTrendWrapper, getCurrentDataSource } from '@/wrappers'
import { FilterService } from './FilterService'
import { UserService } from './UserService'

/**
 * 原始热点数据格式（各Wrapper返回的通用接口）
 */
interface RawTrend {
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
 * 热点采集服务 - 调用Wrapper获取热点数据
 * 业务逻辑层，负责数据标准化和缓存
 */
export class TrendService {
  private static wrapper = createTrendWrapper()
  private static cache: {
    trends: Trend[]
    lastUpdated: Date
  } | null = null

  private static readonly CACHE_DURATION = 15 * 60 * 1000 // 15分钟

  /**
   * 将Wrapper数据转换为标准Trend格式
   */
  private static normalizeTrend(raw: RawTrend): Trend {
    return {
      id: raw.id,
      name: raw.name,
      displayName: raw.displayName,
      volume: raw.volume,
      growthRate: raw.growthRate,
      category: raw.category,
      regions: raw.regions,
      isPublic: raw.isPublic,
      relatedTweets: raw.relatedTweets,
      url: raw.url,
      keywords: raw.keywords,
      demographics: raw.demographics,
      updatedAt: raw.updatedAt,
    }
  }

  /**
   * 批量转换热点数据
   */
  private static normalizeTrends(rawTrends: RawTrend[]): Trend[] {
    return rawTrends.map(this.normalizeTrend)
  }

  /**
   * 获取所有热点
   */
  static async getAllTrends(): Promise<Trend[]> {
    // 检查缓存
    if (this.cache && Date.now() - this.cache.lastUpdated.getTime() < this.CACHE_DURATION) {
      return this.cache.trends
    }

    // 从Wrapper获取原始数据
    const dataSource = getCurrentDataSource()
    let rawTrends: RawTrend[] = []

    if (dataSource === 'mock') {
      rawTrends = await (this.wrapper as any).getTrends()
    } else {
      // 对于其他Wrapper，统一处理
      const result = await this.wrapper.getTrends()
      // XApiWrapper返回XApiTrend[], MCPWrapper返回MCPTrend[]
      // 我们需要将这些转换为我们的格式
      rawTrends = result.map(this.mapFromUnknownFormat)
    }

    const trends = this.normalizeTrends(rawTrends)

    // 更新缓存
    this.cache = {
      trends,
      lastUpdated: new Date(),
    }

    return trends
  }

  /**
   * 将不同Wrapper的格式转换为RawTrend格式
   */
  private static mapFromUnknownFormat(item: any): RawTrend {
    // MockWrapper 已经有正确格式
    if (item.id) return item

    // XApiWrapper 格式转换
    if (item.query) {
      return {
        id: `trend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: item.name,
        displayName: item.name,
        volume: item.tweet_volume || 0,
        growthRate: 0,
        category: 'unknown',
        regions: ['global'],
        isPublic: true,
        url: item.url,
        updatedAt: new Date().toISOString(),
      }
    }

    // MCPWrapper 格式转换
    return {
      id: item.id,
      name: item.name,
      displayName: item.name,
      volume: item.volume || 0,
      growthRate: item.growthRate || 0,
      category: item.category || 'unknown',
      regions: ['global'],
      isPublic: true,
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * 根据地区筛选热点
   */
  static async getTrendsByRegion(region: string): Promise<Trend[]> {
    const dataSource = getCurrentDataSource()
    let rawTrends: RawTrend[] = []

    if (dataSource === 'mock') {
      rawTrends = await (this.wrapper as any).getTrendsByRegion(region)
    } else if (dataSource === 'xapi') {
      rawTrends = await (this.wrapper as any).getTrendsByRegion(region)
      rawTrends = rawTrends.map(this.mapFromUnknownFormat)
    }

    return this.normalizeTrends(rawTrends)
  }

  /**
   * 获取公共热点（所有用户可见）
   */
  static async getPublicTrends(): Promise<Trend[]> {
    // 对于MockWrapper，使用其专用方法
    if (getCurrentDataSource() === 'mock') {
      const rawTrends = await (this.wrapper as any).getPublicTrends()
      return this.normalizeTrends(rawTrends)
    }

    // 对于其他数据源，从所有热点中筛选公共热点
    const allTrends = await this.getAllTrends()
    return allTrends.filter((t) => t.isPublic)
  }

  /**
   * 根据ID获取热点
   */
  static async getTrendById(id: string): Promise<Trend | null> {
    // 对于MockWrapper，使用其专用方法
    if (getCurrentDataSource() === 'mock') {
      const rawTrend = await (this.wrapper as any).getTrendById(id)
      return rawTrend ? this.normalizeTrend(rawTrend) : null
    }

    // 对于其他Wrapper，从getAllTrends中查找
    const allTrends = await this.getAllTrends()
    return allTrends.find((t) => t.id === id) || null
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
    // 获取原始数据
    let trends: Trend[]

    if (params.region) {
      trends = await this.getTrendsByRegion(params.region)
    } else {
      trends = await this.getAllTrends()
    }

    // 使用FilterService进行筛选
    const profile = UserService.getUserProfile()
    return FilterService.filterTrends(trends, profile, {
      limit: params.limit || 10,
      includePublic: true,
    })
  }

  /**
   * 强制刷新缓存
   */
  static async refreshCache(): Promise<Trend[]> {
    this.cache = null
    return this.getAllTrends()
  }

  /**
   * 获取缓存状态
   */
  static getCacheStatus(): {
    isCached: boolean
    age: number
    lastUpdated: Date | null
    dataSource: string
  } {
    return {
      isCached: !!this.cache,
      age: this.cache ? Date.now() - this.cache.lastUpdated.getTime() : 0,
      lastUpdated: this.cache?.lastUpdated || null,
      dataSource: getCurrentDataSource(),
    }
  }
}
