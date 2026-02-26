# X热点数据获取架构设计

## 1. 概述

### 1.1 设计目标

| 目标 | 说明 |
|-----|------|
| **可靠性** | API调用失败时自动降级到备选方案 |
| **性能** | 缓存热点数据，减少API调用 |
| **实时性** | 支持定时刷新和手动刷新 |
| **扩展性** | 支持多种数据源（X API、MCP、Mock） |

### 1.2 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        X热点数据获取架构                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   TrendService (业务层)                                                  │
│         │                                                               │
│         ▼                                                               │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │                  DataSourceManager (数据源管理器)           │       │
│   │                                                           │       │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │       │
│   │   │ XApiWrapper  │  │ MCPWrapper  │  │ MockWrapper │      │       │
│   │   │  (主要数据源) │  │ (备选数据源) │  │ (降级数据源) │      │       │
│   │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘      │       │
│   └──────────┼──────────────┼──────────────┼───────────────┘       │
│              │              │              │                         │
│              ▼              ▼              ▼                         │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │                    CacheLayer (缓存层)                     │       │
│   │                                                           │       │
│   │   内存缓存 ──→ 热点数据 (TTL: 15分钟)                      │       │
│   │   文件缓存 ──→ 备份数据                                   │       │
│   └─────────────────────────────────────────────────────────────┘       │
│              │                                                        │
│              ▼                                                        │
│   ┌─────────────────────────────────────────────────────────────┐       │
│   │                  Normalizer (数据标准化器)                │       │
│   │                                                           │       │
│   │   统一数据格式 → Trend[]                                  │       │
│   └─────────────────────────────────────────────────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. X API 接口分析

### 2.1 Twitter API v2 端点

| 端点 | 方法 | 说明 | 限制 |
|-----|------|------|------|
| `/2/trends/search` | GET | 搜索趋势话题 | 450次/15分钟 (Pro) |
| `/2/trends/place` | GET | 获取指定地点的趋势 | 75次/15分钟 (Free) |
| `/2/tweets/search/recent` | GET | 搜索推文 | 180次/15分钟 (Free) |
| `/2/users/:id/tweets` | GET | 获取用户推文 | 15次/15分钟 (Free) |

### 2.2 地区ID (WOEID) 映射

| 地区 | WOEID | 说明 |
|-----|-------|------|
| 全球 | 1 | Worldwide |
| 美国 | 23424977 | United States |
| 中国 | 23424781 | China |
| 英国 | 23424975 | United Kingdom |
| 日本 | 23424856 | Japan |
| 加拿大 | 23424775 | Canada |
| 澳大利亚 | 23424748 | Australia |

### 2.3 API认证方式

```typescript
// Bearer Token 认证 (推荐)
headers: {
  'Authorization': 'Bearer ${BEARER_TOKEN}',
  'Content-Type': 'application/json'
}

// API Key + Secret (OAuth 2.0)
// 适用于需要更高权限的场景
```

---

## 3. 数据获取流程

### 3.1 完整获取流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      热点数据获取流程                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  用户请求 → 检查缓存 → 缓存命中?                                        │
│                      │                                                 │
│                   ┌──┴──┐                                              │
│                   │ 是  │ 否                                            │
│                   ▼     ▼                                               │
│            返回缓存   尝试获取新数据                                    │
│                      │                                                 │
│          ┌─────────────────────┐                                       │
│          │   选择数据源          │                                       │
│          │  X API (V2.0)        │                                       │
│          │  或 MCP服务 (备选)    │                                       │
│          └──────────┬──────────┘                                       │
│                     │                                                 │
│                     ▼                                                 │
│          ┌─────────────────────┐                                       │
│          │   Wrapper调用        │                                       │
│          │   - 重试机制          │                                       │
│          │   - 超时处理          │                                       │
│          │   - 错误日志          │                                       │
│          └──────────┬──────────┘                                       │
│                     │                                                 │
│                     ▼                                                 │
│          ┌─────────────────────┐                                       │
│          │   原始数据            │                                       │
│          │   X API / MCP / Mock  │                                       │
│          └──────────┬──────────┘                                       │
│                     │                                                 │
│                     ▼                                                 │
│          ┌─────────────────────┐                                       │
│          │   数据标准化          │                                       │
│          │   统一格式转换        │                                       │
│          └──────────┬──────────┘                                       │
│                     │                                                 │
│                     ▼                                                 │
│          ┌─────────────────────┐                                       │
│          │   写入缓存            │                                       │
│          │   内存 + 文件备份      │                                       │
│          └──────────┬──────────┘                                       │
│                     │                                                 │
│                     ▼                                                 │
│                返回热点数据                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 伪代码实现

```typescript
// 数据获取主流程
class TrendService {
  private cache: Cache
  private wrapper: TrendWrapper

  async getTrends(region: string, forceRefresh = false): Promise<Trend[]> {
    // 1. 检查缓存
    if (!forceRefresh) {
      const cached = await this.cache.get(region)
      if (cached) return cached
    }

    // 2. 获取新数据
    try {
      const rawTrends = await this.wrapper.fetchTrends(region)

      // 3. 标准化数据
      const trends = this.normalize(rawTrends)

      // 4. 写入缓存
      await this.cache.set(region, trends, { ttl: 15 * 60 * 1000 })

      return trends
    } catch (error) {
      // 5. 错误处理：返回缓存或降级到Mock
      console.error('获取热点失败:', error)

      const staleCache = await this.cache.get(region, { allowStale: true })
      if (staleCache) {
        console.warn('使用过期缓存数据')
        return staleCache
      }

      // 6. 最后降级：返回Mock数据
      return this.getMockTrends(region)
    }
  }
}
```

---

## 4. Wrapper封装层设计

### 4.0 层级职责与边界（重要）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Wrapper 层职责边界说明                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    前端层 (Frontend)                            │   │
│  │                    用户界面、交互逻辑                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            │                                            │
│                            ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              Next.js API Routes (后端API层)                     │   │
│  │              /api/trends, /api/tasks, ...                       │   │
│  │              处理HTTP请求、鉴权、配额检查                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            │                                            │
│                            ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    业务逻辑层 (Services)                        │   │
│  │                    TrendService, TaskService                    │   │
│  │                    数据筛选、任务生成                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            │                                            │
│                            ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  Wrapper 封装层 (重点)                          │   │
│  │                                                                 │   │
│  │  ✓ 职责：直接调用外部第三方 API                                  │   │
│  │  ✓ 位置：与 API Routes 同级，属于后端代码                         │   │
│  │  ✓ 权限：可访问环境变量、调用外部 HTTP 服务                      │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  正确调用方式 ✓                                         │   │   │
│  │  │  ─────────────────────────────────────────────────────  │   │   │
│  │  │  XApiWrapper.fetchTrends()                              │   │   │
│  │  │       │                                                 │   │   │
│  │  │       └─> fetch('https://api.twitter.com/1.1/...')      │   │   │
│  │  │           直接调用 Twitter 外部 API                      │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │  错误调用方式 ✗                                         │   │   │
│  │  │  ─────────────────────────────────────────────────────  │   │   │
│  │  │  XApiWrapper.fetchTrends()                              │   │   │
│  │  │       │                                                 │   │   │
│  │  │       └─> fetch('/api/x-proxy?region=us')               │   │   │
│  │  │           错误！这是调用内部API，会产生循环               │   │   │
│  │  │           Wrapper 本身就是后端代码，无需通过代理         │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                            │                                            │
│                            ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  外部第三方 API                                  │   │
│  │                                                                 │   │
│  │  • Twitter API: https://api.twitter.com/1.1/trends/place.json  │   │
│  │  • MCP 服务:   http://mcp-server.example.com/trends            │   │
│  │  • 其他: ...                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.0.1 关键原则

| 原则 | 说明 | 示例 |
|-----|------|-----|
| **直接调用** | Wrapper 直接 fetch 外部 API，而非内部代理 | `fetch('https://api.twitter.com/...')` ✓ |
| **后端执行** | Wrapper 在服务端执行，可安全使用环境变量 | `process.env.X_BEARER_TOKEN` ✓ |
| **无内部跳转** | 不要调用 `/api/*` 内部端点，避免循环 | `fetch('/api/x-proxy')` ✗ |
| **统一封装** | 所有第三方调用通过 Wrapper，不分散在各处 | Service → Wrapper → External API |

### 4.0.2 代码目录结构

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes (后端API层)
│   │   │   ├── trends/
│   │   │   │   └── route.ts      # GET /api/trends
│   │   │   ├── tasks/
│   │   │   │   └── route.ts      # POST /api/tasks
│   │   │   └── ...
│   │   └── ...
│   │
│   ├── services/                 # 业务逻辑层
│   │   ├── TrendService.ts       # 调用 Wrapper 获取热点
│   │   └── TaskService.ts        # 调用模板生成任务
│   │
│   ├── wrappers/                 # 第三方接口封装层 (与 services 同级)
│   │   ├── BaseWrapper.ts        # 基础封装类
│   │   ├── XApiWrapper.ts        # 直接调用 Twitter API
│   │   │   # 正确: fetch('https://api.twitter.com/1.1/...')
│   │   │   # 错误: fetch('/api/x-proxy')
│   │   ├── MCPWrapper.ts         # 直接调用 MCP 服务
│   │   └── MockWrapper.ts        # 模拟数据
│   │
│   └── components/               # 前端组件
│       └── ...
```

### 4.0.3 调用链路

```
正确的调用链路:
  前端组件 → API Route (/api/trends) → TrendService → XApiWrapper → Twitter API

错误的调用链路:
  前端组件 → API Route (/api/trends) → XApiWrapper → API Route (/api/x-proxy) → Twitter API
                                                                        ↑
                                                            多余的一层，会造成循环
```

---

### 4.1 BaseWrapper 基础封装

```typescript
// wrappers/BaseWrapper.ts
export abstract class BaseWrapper {
  protected config: any
  protected retryCount: number = 3
  protected timeout: number = 10000
  protected retryDelay: number = 1000

  constructor(config: any) {
    this.config = config
  }

  /**
   * 带重试和超时的请求执行
   */
  protected async execute<R>(
    fn: () => Promise<R>,
    context: string
  ): Promise<R> {
    return this.fetchWithTimeout(
      () => this.fetchWithRetry(fn, context),
      this.timeout
    )
  }

  /**
   * 重试机制（指数退避）
   */
  protected async fetchWithRetry<R>(
    fn: () => Promise<R>,
    context: string
  ): Promise<R> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        const result = await fn()

        if (attempt > 1) {
          console.log(`[${context}] 第${attempt}次尝试成功`)
        }

        return result
      } catch (error) {
        lastError = error as Error
        console.warn(
          `[${context}] 第${attempt}次尝试失败: ${(error as Error).message}`
        )

        if (attempt < this.retryCount) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
    }

    throw new Error(
      `[${context}] 请求失败，已重试${this.retryCount}次: ${lastError!.message}`
    )
  }

  /**
   * 超时机制
   */
  protected async fetchWithTimeout<R>(
    fn: () => Promise<R>,
    timeoutMs: number
  ): Promise<R> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`请求超时 (${timeoutMs}ms)`)), timeoutMs)
      )
    ])
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### 4.2 XApiWrapper X API封装

```typescript
// wrappers/XApiWrapper.ts
import { BaseWrapper } from './BaseWrapper'

export interface XApiTrend {
  name: string
  url: string
  promoted_content: number
  query: string
  tweet_volume: number
}

export class XApiWrapper extends BaseWrapper<{
  bearerToken: string
  baseUrl: string
}> {
  constructor() {
    super({
      bearerToken: process.env.X_BEARER_TOKEN || '',
      baseUrl: 'https://api.twitter.com/2'
    })
  }

  /**
   * 获取指定地区的趋势
   * @param woeid Yahoo Weather ID
   */
  async fetchTrends(woeid: number = 1): Promise<XApiTrend[]> {
    if (!this.config.bearerToken) {
      throw new Error('X API Bearer Token 未配置')
    }

    return this.execute(
      async () => {
        const response = await fetch(
          `${this.config.baseUrl}/trends/place.json?id=${woeid}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.bearerToken}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('X API 请求超限 (429)')
          }
          if (response.status === 401) {
            throw new Error('X API 认证失败 (401)')
          }
          throw new Error(`X API 错误: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        return data[0]?.trends || []
      },
      'XApiWrapper.fetchTrends'
    )
  }

  /**
   * 根据地区代码获取趋势
   */
  async fetchByRegion(region: string): Promise<XApiTrend[]> {
    const woeidMap: Record<string, number> = {
      'global': 1,
      'us': 23424977,
      'cn': 23424781,
      'uk': 23424975,
      'jp': 23424856
    }

    const woeid = woeidMap[region] ?? 1
    return this.fetchTrends(woeid)
  }

  /**
   * 搜索相关推文（可选）
   */
  async searchTweets(query: string, maxResults = 10): Promise<any[]> {
    return this.execute(
      async () => {
        const response = await fetch(
          `${this.config.baseUrl}/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${maxResults}`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.bearerToken}`
            }
          }
        )

        if (!response.ok) {
          throw new Error(`X API 搜索失败: ${response.status}`)
        }

        const data = await response.json()
        return data.data || []
      },
      'XApiWrapper.searchTweets'
    )
  }
}
```

### 4.3 MCPWrapper 备选数据源

```typescript
// wrappers/MCPWrapper.ts
import { BaseWrapper } from './BaseWrapper'

export interface MCPTrend {
  id: string
  name: string
  volume: number
  growthRate: number
  category: string
  timestamp: string
}

export class MCPWrapper extends BaseWrapper<{
  serverUrl: string
}> {
  constructor() {
    super({
      serverUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp'
    })
  }

  /**
   * 从MCP服务获取热点数据
   */
  async fetchTrends(region: string): Promise<MCPTrend[]> {
    return this.execute(
      async () => {
        const response = await fetch(`${this.config.serverUrl}/trends`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            region,
            limit: 20,
            includeVolume: true
          })
        })

        if (!response.ok) {
          throw new Error(`MCP服务错误: ${response.status}`)
        }

        const data = await response.json()
        return data.trends || []
      },
      'MCPWrapper.fetchTrends'
    )
  }

  /**
   * MCP服务健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/health`, {
        method: 'GET'
      })
      return response.ok
    } catch {
      return false
    }
  }
}
```

### 4.4 MockWrapper MVP数据源

```typescript
// wrappers/MockWrapper.ts
import { BaseWrapper } from './BaseWrapper'
import mockData from '@/data/mock-trends.json'

export interface MockTrend {
  id: string
  name: string
  displayName: string
  volume: number
  growthRate: number
  category: string
  regions: string[]
  isPublic: boolean
  url: string
}

export class MockWrapper extends BaseWrapper {
  constructor() {
    super({})
  }

  /**
   * 获取模拟热点数据
   */
  async fetchTrends(region: string): Promise<MockTrend[]> {
    // 模拟网络延迟
    await this.sleep(300 + Math.random() * 500)

    const allTrends = mockData.trends || []

    // 根据地区筛选
    if (region === 'global') {
      return allTrends
    }

    // 返回公共热点 + 地区相关热点
    return allTrends.filter((trend: MockTrend) =>
      trend.isPublic || trend.regions?.includes(region)
    )
  }

  /**
   * 获取特定热点详情
   */
  async getTrendDetail(trendId: string): Promise<MockTrend | null> {
    await this.sleep(200)

    const allTrends = mockData.trends || []
    return allTrends.find((t: any) => t.id === trendId) || null
  }

  /**
   * 刷新模拟数据（模拟数据变化）
   */
  async refreshData(): Promise<void> {
    // 可以在这里实现模拟数据的"实时"更新
    // 例如：随机调整volume和growthRate
    const trends = mockData.trends || []
    trends.forEach((trend: any) => {
      trend.volume = Math.floor(trend.volume * (0.9 + Math.random() * 0.2))
      trend.growthRate = +(trend.growthRate * (0.8 + Math.random() * 0.4)).toFixed(1)
    })
  }
}
```

---

## 5. 缓存策略设计

### 5.1 多级缓存架构

```
┌─────────────────────────────────────────────────────────────┐
│                      多级缓存架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  请求 → L1内存缓存 → L2文件缓存 → 数据源                  │
│         (TTL: 15min)   (TTL: 1小时)                         │
│                                                             │
│  缓存更新策略：                                             │
│  - 定时刷新：每15分钟自动更新                                │
│  - 手动刷新：用户主动触发                                    │
│  - 写穿透：写入数据源时同时更新缓存                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 缓存实现

```typescript
// lib/cache/TrendCache.ts
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class TrendCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map()
  private fileCacheDir: string = './data/cache'

  /**
   * 获取缓存数据
   */
  async get<T>(key: string, options?: { allowStale?: boolean }): Promise<T | null> {
    // L1: 内存缓存
    const memEntry = this.memoryCache.get(key)

    if (memEntry) {
      const now = Date.now()
      const isExpired = (now - memEntry.timestamp) > memEntry.ttl

      if (!isExpired || options?.allowStale) {
        if (isExpired) {
          console.log(`[Cache] ${key} 已过期，但允许使用过期数据`)
        }
        return memEntry.data
      }
    }

    // L2: 文件缓存
    try {
      const filePath = `${this.fileCacheDir}/${key}.json`
      const fs = await import('fs/promises')
      const content = await fs.readFile(filePath, 'utf-8')
      const entry: CacheEntry<T> = JSON.parse(content)

      const now = Date.now()
      const isExpired = (now - entry.timestamp) > entry.ttl

      if (!isExpired || options?.allowStale) {
        // 回填内存缓存
        this.memoryCache.set(key, entry)
        return entry.data
      }
    } catch (error) {
      // 文件不存在或读取失败
    }

    return null
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 15 * 60 * 1000 // 默认15分钟
    }

    // 写入内存缓存
    this.memoryCache.set(key, entry)

    // 写入文件缓存（异步）
    this.writeToFile(key, entry).catch(err => {
      console.error('[Cache] 写入文件缓存失败:', err)
    })
  }

  /**
   * 清除缓存
   */
  async invalidate(key?: string): Promise<void> {
    if (key) {
      this.memoryCache.delete(key)
      // 删除文件缓存
      try {
        const fs = await import('fs/promises')
        await fs.unlink(`${this.fileCacheDir}/${key}.json`)
      } catch {
        // 忽略删除失败
      }
    } else {
      this.memoryCache.clear()
    }
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys())
    }
  }

  private async writeToFile<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      const fs = await import('fs/promises')
      await fs.mkdir(this.fileCacheDir, { recursive: true })
      await fs.writeFile(
        `${this.fileCacheDir}/${key}.json`,
        JSON.stringify(entry, null, 2)
      )
    } catch (error) {
      console.error('[Cache] 写入文件失败:', error)
    }
  }
}

export const trendCache = new TrendCache()
```

---

## 6. 数据降级与容错

### 6.1 降级策略

```
┌─────────────────────────────────────────────────────────────┐
│                      降级策略                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  X API 调用                                                  │
│     │                                                        │
│     ├─ 成功 → 返回数据，写入缓存                             │
│     │                                                        │
│     ├─ 失败 (429限流)                                       │
│     │     └─ 尝试 MCP 服务                                   │
│     │         ├─ 成功 → 返回数据                             │
│     │         └─ 失败 → 降级到 Mock                         │
│     │                                                    │
│     └─ 失败 (超时/5xx错误)                                  │
│           └─ 返回过期缓存 (如有)                            │
│               └─ 无缓存 → 降级到 Mock                       │
│                                                             │
│  Mock 数据 (最后保底)                                        │
│     └─ 返回模拟数据，记录降级日志                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 容错配置

```typescript
// config/data-source.ts
export const dataSourceConfig = {
  // 主要数据源
  primary: {
    type: 'x-api',
    enabled: !!process.env.X_BEARER_TOKEN,
    priority: 1
  },

  // 备选数据源
  secondary: {
    type: 'mcp',
    enabled: !!process.env.MCP_SERVER_URL,
    priority: 2
  },

  // 降级数据源
  fallback: {
    type: 'mock',
    enabled: true,
    priority: 3
  },

  // 容错配置
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },

  timeout: {
    connection: 5000,
    read: 10000
  },

  cache: {
    defaultTTL: 15 * 60 * 1000, // 15分钟
    staleTTL: 60 * 60 * 1000,  // 1小时（允许使用过期数据）
    maxSize: 100 // 内存缓存最大条目数
  }
}
```

---

## 7. 数据标准化

### 7.1 统一数据格式

```typescript
// types/trend.ts
export interface Trend {
  id: string                // 唯一标识
  name: string              // 热点名称 (带#)
  displayName: string      // 显示名称 (去#)
  volume: number           // 推文量
  growthRate: number       // 增长率 (%)
  category: string         // 分类
  regions: string[]        // 相关地区
  isPublic: boolean        // 是否为公共热点
  url: string              // X平台链接
  keywords: string[]       // 相关关键词
  dataSource: 'x-api' | 'mcp' | 'mock'  // 数据来源
  fetchedAt: string        // 获取时间
}

export interface TrendDetail extends Trend {
  relatedTweets: {
    id: string
    text: string
    author: string
    url: string
    metrics: {
      likes: number
      retweets: number
      replies: number
    }
  }[]
}
```

### 7.2 数据标准化器

```typescript
// lib/normalizer/trend-normalizer.ts
class TrendNormalizer {
  /**
   * 标准化X API数据
   */
  static fromXApi(xTrend: XApiTrend): Trend {
    return {
      id: `x-trend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: xTrend.name,
      displayName: xTrend.name.replace(/^#/, ''),
      volume: xTrend.tweet_volume || 0,
      growthRate: 0, // X API不直接提供增长率，需计算
      category: this.inferCategory(xTrend.name),
      regions: ['global'],
      isPublic: true,
      url: xTrend.url,
      keywords: this.extractKeywords(xTrend.name),
      dataSource: 'x-api',
      fetchedAt: new Date().toISOString()
    }
  }

  /**
   * 标准化MCP数据
   */
  static fromMCP(mcpTrend: MCPTrend): Trend {
    return {
      id: mcpTrend.id,
      name: mcpTrend.name,
      displayName: mcpTrend.name.replace(/^#/, ''),
      volume: mcpTrend.volume,
      growthRate: mcpTrend.growthRate,
      category: mcpTrend.category,
      regions: ['global'],
      isPublic: mcpTrend.volume > 100000,
      url: `https://x.com/search?q=${encodeURIComponent(mcpTrend.name)}`,
      keywords: this.extractKeywords(mcpTrend.name),
      dataSource: 'mcp',
      fetchedAt: mcpTrend.timestamp
    }
  }

  /**
   * 标准化Mock数据
   */
  static fromMock(mockTrend: MockTrend): Trend {
    return {
      ...mockTrend,
      dataSource: 'mock',
      fetchedAt: new Date().toISOString()
    }
  }

  /**
   * 推断分类
   */
  private static inferCategory(name: string): string {
    const keywords = {
      sports: ['superbowl', 'world cup', 'olympics', 'nba', 'nfl'],
      tech: ['ai', 'crypto', 'bitcoin', 'tech', 'apple', 'google'],
      entertainment: ['oscars', 'grammy', 'movie', 'celebrity'],
      politics: ['election', 'president', 'vote', 'congress']
    }

    const lowerName = name.toLowerCase()
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(w => lowerName.includes(w))) {
        return category
      }
    }

    return 'other'
  }

  /**
   * 提取关键词
   */
  private static extractKeywords(name: string): string[] {
    // 移除#号，分割单词
    return name
      .replace(/^#/, '')
      .split(/[\s\-–—]+/)
      .filter(w => w.length > 2)
  }
}
```

---

## 8. 定时刷新机制

### 8.1 刷新调度器

```typescript
// lib/scheduler/trend-refresh-scheduler.ts
class TrendRefreshScheduler {
  private interval: NodeJS.Timeout | null = null
  private isRefreshing: boolean = false

  /**
   * 启动定时刷新
   * @param intervalMinutes 刷新间隔（分钟）
   */
  start(intervalMinutes: number = 15) {
    if (this.interval) {
      console.warn('[Scheduler] 定时任务已在运行')
      return
    }

    console.log(`[Scheduler] 启动定时刷新，间隔: ${intervalMinutes}分钟`)

    this.interval = setInterval(async () => {
      if (this.isRefreshing) {
        console.warn('[Scheduler] 上次刷新仍在进行，跳过此次刷新')
        return
      }

      await this.refreshAll()
    }, intervalMinutes * 60 * 1000)
  }

  /**
   * 刷新所有地区的数据
   */
  private async refreshAll() {
    this.isRefreshing = true

    try {
      const regions = ['global', 'us', 'cn', 'uk', 'jp']

      for (const region of regions) {
        try {
          console.log(`[Scheduler] 刷新 ${region} 数据`)
          const trendService = new TrendService()
          await trendService.getTrends(region, true) // forceRefresh = true
          console.log(`[Scheduler] ${region} 刷新成功`)
        } catch (error) {
          console.error(`[Scheduler] ${region} 刷新失败:`, error)
        }
      }

      console.log('[Scheduler] 所有地区刷新完成')
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * 停止定时刷新
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      console.log('[Scheduler] 定时刷新已停止')
    }
  }
}

// 服务端启动时初始化
if (typeof window === 'undefined') {
  const scheduler = new TrendRefreshScheduler()
  scheduler.start(15) // 每15分钟刷新
}
```

---

## 9. MVP阶段实施计划

### 9.1 阶段划分

| 阶段 | 时间 | 内容 |
|-----|------|------|
| **Phase 1** | 1小时 | 实现MockWrapper，完成模拟数据展示 |
| **Phase 2** | 2小时 | 实现XApiWrapper，完成API调用封装 |
| **Phase 3** | 1小时 | 实现MCPWrapper，完成备选数据源 |
| **Phase 4** | 1小时 | 实现缓存层和降级策略 |

### 9.2 MVP阶段优先级

```
P0 (必须完成):
  └─ MockWrapper + 基础数据格式
  └─ 简单缓存机制
  └─ TrendService基础功能

P1 (重要):
  └─ XApiWrapper 封装
  └─ 多级缓存
  └─ 降级策略

P2 (可选):
  └─ MCPWrapper
  └─ 定时刷新
  └─ 详细日志
```

---

## 10. 环境配置

### 10.1 环境变量

```bash
# .env.local - 本地开发配置
X_BEARER_TOKEN=your_twitter_bearer_token_here
X_API_KEY=your_api_key_here
X_API_SECRET=your_api_secret_here

MCP_SERVER_URL=http://localhost:3000/mcp

# 缓存配置
CACHE_TTL=900000              # 15分钟（毫秒）
CACHE_STALE_TTL=3600000       # 1小时

# 降级配置
ENABLE_FALLBACK=true
MOCK_ON_FAILURE=true

# 日志
LOG_LEVEL=debug
```

### 10.2 运行时配置

```typescript
// config/data-source.ts
export const runtimeConfig = {
  dataSource: {
    primary: process.env.X_BEARER_TOKEN ? 'x-api' : 'mock',
    secondary: process.env.MCP_SERVER_URL ? 'mcp' : null,
    fallback: 'mock'
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '900000'),
    staleTtl: parseInt(process.env.CACHE_STALE_TTL || '3600000'),
    enabled: true
  },

  retry: {
    enabled: true,
    maxAttempts: 3
  },

  fallback: {
    enabled: process.env.ENABLE_FALLBACK === 'true',
    useMockOnError: process.env.MOCK_ON_FAILURE === 'true'
  }
}
```

---

## 11. 实施注意事项（给开发工程师）

### 11.1 常见错误

| 错误 | 现象 | 正确做法 |
|-----|------|---------|
| **Wrapper 调用内部 API** | 请求循环、性能下降 | 直接 fetch 外部 API |
| **在前端组件中直接使用 Wrapper** | 暴露敏感 Token | Wrapper 只在服务端使用 |
| **忽略速率限制** | API 返回 429 错误 | 使用 BaseWrapper 的重试机制 |
| **不处理降级** | API 挂了整个服务不可用 | 实现 MockWrapper 作为保底 |

### 11.2 检查清单

实现 Wrapper 时请确认：

- [ ] Wrapper 代码位于 `src/wrappers/` 目录
- [ ] 直接调用外部 API URL（如 `https://api.twitter.com`）
- [ ] 使用环境变量存储敏感信息（如 `X_BEARER_TOKEN`）
- [ ] 继承 BaseWrapper 以获得重试和超时能力
- [ ] 实现错误处理和日志记录
- [ ] 编写对应的 MockWrapper 用于开发测试

---

*文档版本: v1.1*
*创建日期: 2026-02-27*
*最后更新: 2026-02-27 (新增Wrapper层职责边界说明)*
*负责人: 系统架构师*
